// Fonctions serveur partagées par /api/ai-improve et /api/ai-import :
// appels aux fournisseurs d'IA, vérification de l'utilisateur et quota journalier.

export const DAILY_LIMIT = 10; // appels IA gratuits par utilisateur et par jour (améliorations + imports)

export const CLOUDFLARE_MODEL = process.env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Groq, Mistral et OpenRouter parlent tous le format "OpenAI chat completions".
export async function callOpenAICompat(
  url: string,
  key: string | undefined,
  model: string,
  system: string,
  user: string,
  maxTokens = 700
): Promise<string | null> {
  if (!key) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

export async function callCloudflare(system: string, user: string, maxTokens = 700): Promise<string | null> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return null;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CLOUDFLARE_MODEL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.result?.response;
  return typeof text === "string" && text.trim() ? text.trim() : null;
}

// ---------- Authentification + quota (Firebase, sans SDK admin) ----------

export async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
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
export async function readUsage(idToken: string, docId: string): Promise<number | null> {
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

export async function writeUsage(idToken: string, docId: string, current: number): Promise<void> {
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

export function todayUsageDocId(uid: string): string {
  return `${uid}_${new Date().toISOString().slice(0, 10)}`;
}
