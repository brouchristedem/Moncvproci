import { NextRequest, NextResponse } from "next/server";

// Amélioration d'un texte de CV par IA, 100 % sur les offres gratuites :
// Gemini en premier, Groq en secours si Gemini est indisponible ou saturé.
// Aucune dépendance payante : sans clé configurée, la route répond "non configuré".
//
// Variables d'environnement (Vercel) :
//   GEMINI_API_KEY      (https://aistudio.google.com/apikey)
//   GROQ_API_KEY        (https://console.groq.com/keys)
//   MISTRAL_API_KEY     (https://console.mistral.ai/api-keys)
//   OPENROUTER_API_KEY  (https://openrouter.ai/keys) — modèles ":free"
//   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (Workers AI, 10 000 neurons/jour)
// Chaque clé est optionnelle : les fournisseurs sont essayés dans cet ordre et
// on passe au suivant si l'un est saturé (429) ou en panne. Les modèles se
// changent sans toucher au code via GEMINI_MODEL, GROQ_MODEL, MISTRAL_MODEL,
// OPENROUTER_MODEL, CLOUDFLARE_MODEL.

const DAILY_LIMIT = 10; // améliorations IA gratuites par utilisateur et par jour
const MAX_INPUT_CHARS = 1500;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const CLOUDFLARE_MODEL = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

type Kind = "profil" | "experience" | "formation" | "projets" | "lettre" | "autre";

interface AiRequest {
  text: string;
  kind: Kind;
  titre?: string;
  sousTitre?: string;
  langue: "fr" | "en";
}

function maskPersonalData(text: string): string {
  // Le texte envoyé à l'IA ne doit jamais contenir d'email ni de numéro de téléphone.
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+|00)?\d[\d\s().-]{7,}\d/g, "[tel]");
}

function buildPrompt(r: AiRequest): { system: string; user: string } {
  const fr = r.langue === "fr";
  const lang = fr ? "français" : "English";
  const context = [r.titre && `Poste/titre : ${r.titre}`, r.sousTitre && `Organisation : ${r.sousTitre}`]
    .filter(Boolean)
    .join("\n");

  const rules =
    `Tu améliores un texte de CV pour le marché de l'emploi en Côte d'Ivoire et en Afrique de l'Ouest. ` +
    `Écris en ${lang}, au ton professionnel, clair et direct, avec des verbes d'action. ` +
    `Garde STRICTEMENT les faits fournis : n'invente aucun chiffre, pourcentage, outil, diplôme, employeur ni résultat qui ne figure pas dans le texte. ` +
    `Ne change pas la langue. Pas de markdown, pas de guillemets, pas de commentaire, pas de titre : réponds uniquement par le texte amélioré, en texte brut.`;

  const byKind: Record<Kind, string> = {
    profil: `Réécris ce résumé de profil en 2 à 3 phrases maximum (60 mots environ).`,
    experience: `Réécris cette description d'expérience en 2 à 4 phrases courtes, centrées sur les missions et les résultats réellement mentionnés.`,
    formation: `Reformule cette description de formation de façon concise (1 à 3 phrases).`,
    projets: `Reformule cette description de projet en 2 à 3 phrases, en précisant le rôle et le résultat uniquement s'ils sont mentionnés.`,
    lettre: `Améliore ce corps de lettre de motivation : structure claire, ton professionnel et sincère, sans formule excessive. Conserve la longueur à peu près identique.`,
    autre: `Reformule ce texte de façon plus claire et professionnelle, sans l'allonger.`,
  };

  return {
    system: `${rules} ${byKind[r.kind]}`,
    user: `${context ? context + "\n\n" : ""}Texte à améliorer :\n${maskPersonalData(r.text)}`,
  };
}

async function callGemini(system: string, user: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(20000),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts.map((p: { text?: string }) => p.text || "").join("").trim();
  return text || null;
}

// Groq, Mistral et OpenRouter parlent tous le format "OpenAI chat completions".
async function callOpenAICompat(
  url: string,
  key: string | undefined,
  model: string,
  system: string,
  user: string
): Promise<string | null> {
  if (!key) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

async function callCloudflare(system: string, user: string): Promise<string | null> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CLOUDFLARE_MODEL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.result?.response;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

const PROVIDERS: ((system: string, user: string) => Promise<string | null>)[] = [
  callGemini,
  (s, u) => callOpenAICompat("https://api.groq.com/openai/v1/chat/completions", process.env.GROQ_API_KEY, GROQ_MODEL, s, u),
  (s, u) => callOpenAICompat("https://api.mistral.ai/v1/chat/completions", process.env.MISTRAL_API_KEY, MISTRAL_MODEL, s, u),
  (s, u) => callOpenAICompat("https://openrouter.ai/api/v1/chat/completions", process.env.OPENROUTER_API_KEY, OPENROUTER_MODEL, s, u),
  callCloudflare,
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

// ---------- Authentification + quota (Firebase, sans SDK admin) ----------

async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const uid = data?.users?.[0]?.localId;
  return typeof uid === "string" ? { uid } : null;
}

function usageDocUrl(docId?: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/aiUsage`;
  return docId ? `${base}/${docId}` : base;
}

// Lit/écrit le compteur avec le jeton de l'utilisateur : ce sont les règles
// Firestore (aiUsage) qui empêchent de le tricher (il ne peut qu'augmenter de 1).
async function readUsage(idToken: string, docId: string): Promise<number | null> {
  const res = await fetch(usageDocUrl(docId), {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404) return 0;
  if (!res.ok) return null;
  const data = await res.json();
  const n = Number(data?.fields?.count?.integerValue ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function writeUsage(idToken: string, docId: string, current: number): Promise<void> {
  const body = JSON.stringify({ fields: { count: { integerValue: String(current + 1) } } });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
  if (current === 0) {
    await fetch(`${usageDocUrl()}?documentId=${encodeURIComponent(docId)}`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
  } else {
    await fetch(`${usageDocUrl(docId)}?updateMask.fieldPaths=count&currentDocument.exists=true`, {
      method: "PATCH",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
  }
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

    const body = (await req.json()) as Partial<AiRequest>;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (text.length < 15) return NextResponse.json({ error: "too_short" }, { status: 400 });
    if (text.length > MAX_INPUT_CHARS) return NextResponse.json({ error: "too_long" }, { status: 400 });

    const kinds: Kind[] = ["profil", "experience", "formation", "projets", "lettre", "autre"];
    const request: AiRequest = {
      text: text.replace(/\*\*|__/g, ""),
      kind: kinds.includes(body.kind as Kind) ? (body.kind as Kind) : "autre",
      titre: typeof body.titre === "string" ? body.titre.slice(0, 120) : undefined,
      sousTitre: typeof body.sousTitre === "string" ? body.sousTitre.slice(0, 120) : undefined,
      langue: body.langue === "en" ? "en" : "fr",
    };

    // Quota journalier (date UTC) : document aiUsage/{uid}_{AAAA-MM-JJ}
    const day = new Date().toISOString().slice(0, 10);
    const docId = `${user.uid}_${day}`;
    const used = await readUsage(idToken, docId);
    if (used === null) return NextResponse.json({ error: "quota_unavailable" }, { status: 503 });
    if (used >= DAILY_LIMIT) {
      return NextResponse.json({ error: "quota_reached", limit: DAILY_LIMIT }, { status: 429 });
    }

    const { system, user: userPrompt } = buildPrompt(request);
    let result: string | null = null;
    for (const provider of PROVIDERS) {
      try {
        result = await provider(system, userPrompt);
      } catch {
        result = null;
      }
      if (result) break;
    }
    if (!result) return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });

    // On ne compte que les améliorations réussies.
    try {
      await writeUsage(idToken, docId, used);
    } catch {
      // Un souci de compteur ne doit pas faire perdre le résultat à l'utilisateur.
    }

    const clean = result.replace(/\*\*|__/g, "").replace(/^["«»\s]+|["«»\s]+$/g, "");
    return NextResponse.json({ text: clean, remaining: Math.max(0, DAILY_LIMIT - used - 1) });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
