import { NextRequest, NextResponse } from "next/server";
import {
  DAILY_LIMIT,
  callCloudflare,
  callOpenAICompat,
  readUsage,
  todayUsageDocId,
  verifyIdToken,
  writeUsage,
} from "@/lib/aiServer";
import { maskPersonalData } from "@/lib/personalData";

// Import d'un CV existant : le texte extrait du PDF (sans email, téléphone ni
// liens) est structuré en JSON par une IA, puis renvoyé à l'éditeur.
//
// Choix volontaire : on n'utilise ici QUE Cloudflare Workers AI (qui ne s'entraîne
// pas sur les données clients) puis Groq en secours. Ni Gemini ni Mistral en offre
// gratuite, dont les conditions autorisent l'entraînement ou la relecture humaine :
// un CV complet est bien plus sensible qu'une simple phrase à reformuler.

const MAX_TEXT_CHARS = 12000;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_OUTPUT_TOKENS = 3000;

const SYSTEM = `Tu es un extracteur de données de CV. On te donne le texte brut d'un CV (extrait d'un PDF, l'ordre peut être légèrement mélangé). Les coordonnées ont été retirées volontairement : ignore les marqueurs [email], [tel], [lien].
Réponds UNIQUEMENT par un objet JSON valide, sans markdown ni commentaire, avec exactement cette forme :
{
  "prenom": "", "nom": "", "titre": "", "adresse": "",
  "profil": "",
  "experience": [{"titre":"","sousTitre":"","lieu":"","dateDebut":"","dateFin":"","enCours":false,"description":""}],
  "formation": [{"titre":"","sousTitre":"","lieu":"","dateDebut":"","dateFin":"","enCours":false,"description":""}],
  "competences": [{"titre":"","niveau":""}],
  "langues": [{"titre":"","niveau":""}],
  "certifications": [{"titre":"","sousTitre":"","dateDebut":"","dateFin":"","description":""}],
  "projets": [{"titre":"","sousTitre":"","dateDebut":"","dateFin":"","description":""}],
  "interets": [{"titre":""}]
}
Règles strictes :
- Recopie uniquement ce qui est dans le texte. N'invente RIEN : ni poste, ni date, ni chiffre, ni diplôme. Si une information est absente, mets une chaîne vide (ou false, ou une liste vide).
- "titre" (en haut) = le titre professionnel de la personne (ex : Comptable). "profil" = le résumé/objectif s'il existe.
- Pour une expérience : titre = intitulé du poste, sousTitre = entreprise, lieu = ville/pays. Pour une formation : titre = diplôme, sousTitre = école.
- Dates : "AAAA-MM" si le mois est connu (ex : 2022-03), sinon "AAAA". Mets enCours à true et dateFin vide si le texte indique "présent", "aujourd'hui", "en cours" ou "current".
- "description" : les missions ou précisions, une idée par ligne séparée par "\\n", sans puces ni markdown.
- Garde la langue d'origine du CV. Ne traduis pas.`;

type Raw = Record<string, unknown>;

function str(v: unknown, max = 300): string {
  return typeof v === "string" ? v.replace(/\*\*|__/g, "").trim().slice(0, max) : "";
}

function list(v: unknown, max = 15): Raw[] {
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Raw[]).slice(0, max) : [];
}

function entry(r: Raw, withDates = true) {
  return {
    titre: str(r.titre, 200),
    sousTitre: str(r.sousTitre, 200),
    lieu: str(r.lieu, 120),
    dateDebut: withDates ? str(r.dateDebut, 10) : "",
    dateFin: withDates ? str(r.dateFin, 10) : "",
    enCours: r.enCours === true,
    description: str(r.description, 1500),
  };
}

// Ne laisse passer que la forme attendue, avec des longueurs bornées.
function sanitize(raw: Raw) {
  return {
    prenom: str(raw.prenom, 60),
    nom: str(raw.nom, 60),
    titre: str(raw.titre, 120),
    adresse: str(raw.adresse, 160),
    profil: str(raw.profil, 1500),
    experience: list(raw.experience).map((r) => entry(r)),
    formation: list(raw.formation).map((r) => entry(r)),
    competences: list(raw.competences, 30).map((r) => ({ titre: str(r.titre, 100), niveau: str(r.niveau, 60) })),
    langues: list(raw.langues, 10).map((r) => ({ titre: str(r.titre, 60), niveau: str(r.niveau, 60) })),
    certifications: list(raw.certifications).map((r) => entry(r)),
    projets: list(raw.projets).map((r) => entry(r)),
    interets: list(raw.interets, 20).map((r) => ({ titre: str(r.titre, 80) })),
  };
}

function parseJson(text: string): Raw | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Raw) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const hasProvider =
      (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) || process.env.GROQ_API_KEY;
    if (!hasProvider) return NextResponse.json({ error: "not_configured" }, { status: 503 });

    const idToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!idToken) return NextResponse.json({ error: "auth_required" }, { status: 401 });
    const user = await verifyIdToken(idToken);
    if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

    const body = (await req.json()) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (text.length < 80) return NextResponse.json({ error: "too_short" }, { status: 400 });
    if (text.length > MAX_TEXT_CHARS) return NextResponse.json({ error: "too_long" }, { status: 400 });

    const docId = todayUsageDocId(user.uid);
    const used = await readUsage(idToken, docId);
    if (used === null) return NextResponse.json({ error: "quota_unavailable" }, { status: 503 });
    if (used >= DAILY_LIMIT) {
      return NextResponse.json({ error: "quota_reached", limit: DAILY_LIMIT }, { status: 429 });
    }

    const userPrompt = `Texte du CV :\n${maskPersonalData(text)}`;
    const providers: (() => Promise<string | null>)[] = [
      () => callCloudflare(SYSTEM, userPrompt, MAX_OUTPUT_TOKENS),
      () =>
        callOpenAICompat(
          "https://api.groq.com/openai/v1/chat/completions",
          process.env.GROQ_API_KEY,
          GROQ_MODEL,
          SYSTEM,
          userPrompt,
          MAX_OUTPUT_TOKENS
        ),
    ];

    let parsed: Raw | null = null;
    for (const provider of providers) {
      try {
        const out = await provider();
        parsed = out ? parseJson(out) : null;
      } catch {
        parsed = null;
      }
      if (parsed) break;
    }
    if (!parsed) return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });

    try {
      await writeUsage(idToken, docId, used);
    } catch {
      // Un souci de compteur ne doit pas faire perdre le résultat à l'utilisateur.
    }

    return NextResponse.json({ data: sanitize(parsed), remaining: Math.max(0, DAILY_LIMIT - used - 1) });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
