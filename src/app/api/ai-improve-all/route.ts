import { NextRequest, NextResponse } from "next/server";
import {
  DAILY_LIMIT,
  callCloudflare,
  callGemini,
  callOpenAICompat,
  readUsage,
  todayUsageDocId,
  verifyIdToken,
  writeUsage,
} from "@/lib/aiServer";
import { maskPersonalData } from "@/lib/personalData";

// « Améliorer tout mon CV » : un seul appel IA réécrit toutes les descriptions
// (profil, expériences, formations, projets). Il ne compte que pour 1 dans le
// quota journalier commun (DAILY_LIMIT), comme une amélioration simple.
// Mêmes fournisseurs gratuits et mêmes variables d'environnement que /api/ai-improve.

const MAX_ITEMS = 20;
const MAX_ITEM_CHARS = 1500;
const MAX_TOTAL_CHARS = 8000;
const MAX_TOKENS = 3000;

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

type Kind = "profil" | "experience" | "formation" | "projets";
const KINDS: Kind[] = ["profil", "experience", "formation", "projets"];

interface InItem {
  id: string;
  kind: Kind;
  titre?: string;
  sousTitre?: string;
  text: string;
}

function buildPrompt(items: InItem[], langue: "fr" | "en"): { system: string; user: string } {
  const lang = langue === "fr" ? "français" : "English";
  const system =
    `Tu améliores les textes d'un CV pour le marché de l'emploi en Côte d'Ivoire et en Afrique de l'Ouest. ` +
    `Écris en ${lang}, au ton professionnel, clair et direct, avec des verbes d'action. ` +
    `Garde STRICTEMENT les faits fournis : n'invente aucun chiffre, pourcentage, outil, diplôme, employeur ni résultat qui ne figure pas dans le texte. ` +
    `Ne change pas la langue. Pas de markdown, pas de guillemets autour des textes. ` +
    `Consignes par type : profil = 2 à 3 phrases (60 mots environ) ; experience = 2 à 4 phrases courtes centrées sur les missions et résultats réellement mentionnés ; ` +
    `formation = 1 à 3 phrases concises ; projets = 2 à 3 phrases, rôle et résultat uniquement s'ils sont mentionnés. ` +
    `Tu reçois une liste JSON d'éléments. Réponds UNIQUEMENT par un objet JSON valide dont les clés sont les "id" reçus et les valeurs les textes améliorés (texte brut). Aucun autre texte.`;

  const payload = items.map((i) => ({
    id: i.id,
    type: i.kind,
    ...(i.titre ? { titre: i.titre } : {}),
    ...(i.sousTitre ? { organisation: i.sousTitre } : {}),
    texte: maskPersonalData(i.text),
  }));
  return { system, user: JSON.stringify(payload) };
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1));
    return obj && typeof obj === "object" && !Array.isArray(obj) ? (obj as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const PROVIDERS: ((system: string, user: string) => Promise<string | null>)[] = [
  (s, u) => callGemini(s, u, MAX_TOKENS, true),
  (s, u) => callOpenAICompat("https://api.groq.com/openai/v1/chat/completions", process.env.GROQ_API_KEY, GROQ_MODEL, s, u, MAX_TOKENS),
  (s, u) => callOpenAICompat("https://api.mistral.ai/v1/chat/completions", process.env.MISTRAL_API_KEY, MISTRAL_MODEL, s, u, MAX_TOKENS),
  (s, u) => callOpenAICompat("https://openrouter.ai/api/v1/chat/completions", process.env.OPENROUTER_API_KEY, OPENROUTER_MODEL, s, u, MAX_TOKENS),
  (s, u) => callCloudflare(s, u, MAX_TOKENS),
];

function hasAnyProvider(): boolean {
  return !!(
    process.env.GEMINI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.MISTRAL_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN)
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!hasAnyProvider()) {
      return NextResponse.json({ error: "not_configured" }, { status: 503 });
    }

    const idToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!idToken) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const user = await verifyIdToken(idToken);
    if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const body = (await req.json()) as { items?: unknown; langue?: unknown };
    const langue: "fr" | "en" = body.langue === "en" ? "en" : "fr";
    if (!Array.isArray(body.items)) return NextResponse.json({ error: "too_short" }, { status: 400 });

    const items: InItem[] = [];
    let total = 0;
    for (const raw of body.items.slice(0, MAX_ITEMS + 1)) {
      const r = raw as Partial<InItem>;
      const text = typeof r.text === "string" ? r.text.replace(/\*\*|__/g, "").trim() : "";
      if (typeof r.id !== "string" || !KINDS.includes(r.kind as Kind)) continue;
      if (text.length < 15) continue;
      if (text.length > MAX_ITEM_CHARS) return NextResponse.json({ error: "too_long" }, { status: 400 });
      total += text.length;
      items.push({
        id: r.id.slice(0, 20),
        kind: r.kind as Kind,
        titre: typeof r.titre === "string" ? r.titre.slice(0, 120) : undefined,
        sousTitre: typeof r.sousTitre === "string" ? r.sousTitre.slice(0, 120) : undefined,
        text,
      });
    }
    if (items.length === 0) return NextResponse.json({ error: "too_short" }, { status: 400 });
    if (items.length > MAX_ITEMS || total > MAX_TOTAL_CHARS) {
      return NextResponse.json({ error: "too_long" }, { status: 400 });
    }

    // Quota journalier (date UTC) : un seul appel IA = 1 usage.
    const docId = todayUsageDocId(user.uid);
    const used = await readUsage(idToken, docId);
    if (used === null) return NextResponse.json({ error: "quota_unavailable" }, { status: 503 });
    if (used >= DAILY_LIMIT) {
      return NextResponse.json({ error: "quota_reached", limit: DAILY_LIMIT }, { status: 429 });
    }

    const { system, user: userPrompt } = buildPrompt(items, langue);
    let parsed: Record<string, unknown> | null = null;
    for (const provider of PROVIDERS) {
      try {
        const out = await provider(system, userPrompt);
        parsed = out ? parseJsonObject(out) : null;
      } catch {
        parsed = null;
      }
      if (parsed) break;
    }
    if (!parsed) return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });

    // On ne garde que les ids demandés, avec un texte non vide et de taille raisonnable.
    const results: Record<string, string> = {};
    for (const item of items) {
      const v = parsed[item.id];
      if (typeof v !== "string") continue;
      const clean = v.replace(/\*\*|__/g, "").replace(/^["«»\s]+|["«»\s]+$/g, "");
      if (clean.length >= 10 && clean.length <= MAX_ITEM_CHARS * 2) results[item.id] = clean;
    }
    if (Object.keys(results).length === 0) return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });

    try {
      await writeUsage(idToken, docId, used);
    } catch {
      // Un souci de compteur ne doit pas faire perdre le résultat à l'utilisateur.
    }

    return NextResponse.json({ results, remaining: Math.max(0, DAILY_LIMIT - used - 1) });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
