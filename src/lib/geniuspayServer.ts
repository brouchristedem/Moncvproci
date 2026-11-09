// Utilitaires serveur pour GeniusPay (jamais importé côté client : les clés
// secrètes restent sur le serveur).
export const GP_BASE = "https://geniuspay.ci/api/v1/merchant";

// Les montants sont décidés ICI, côté serveur : le navigateur envoie
// seulement "pack: true/false", jamais un montant.
export const GP_PRICE = Number(process.env.NEXT_PUBLIC_PRICE_NEXT || 1000);
export const GP_PRICE_PACK = Number(process.env.NEXT_PUBLIC_PRICE_PACK || 1500);

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
