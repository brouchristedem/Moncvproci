// Vérifie un jeton Firebase (ID token) côté serveur via l'API REST Google
// Identity Toolkit, comme le fait déjà aiServer.ts. On n'utilise PAS
// firebase-admin/auth : sur Vercel, sa dépendance jwks-rsa/jose ne se charge pas.
export interface VerifiedUser {
  uid: string;
  email: string;
  name?: string;
}

export async function verifyUser(idToken: string): Promise<VerifiedUser | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey || !idToken) return null;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const u = data?.users?.[0];
  if (!u?.localId) return null;
  return {
    uid: String(u.localId),
    email: typeof u.email === "string" ? u.email : "",
    name: typeof u.displayName === "string" ? u.displayName : undefined,
  };
}
