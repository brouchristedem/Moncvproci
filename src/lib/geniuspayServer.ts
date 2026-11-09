// Utilitaires serveur pour GeniusPay (jamais importé côté client : les clés
// secrètes restent sur le serveur).
export const GP_BASE = "https://geniuspay.ci/api/v1/merchant";

// Le montant est décidé ICI, côté serveur (voir lib/pricing.ts) : le navigateur
// n'envoie jamais de montant.
export { PASS_PRICE } from "@/lib/pricing";

export function gpHeaders() {
  const key = process.env.GENIUSPAY_API_KEY;
  const secret = process.env.GENIUSPAY_API_SECRET;
  if (!key || !secret) return null;
  return {
    "X-API-Key": key,
    "X-API-Secret": secret,
    "Content-Type": "application/json",
  };
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://moncvproci.com").replace(/\/$/, "");
}
