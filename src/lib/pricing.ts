// Offre unique : le « Pass Candidature ». Un seul paiement donne, pendant
// PASS_DAYS jours, un accès illimité : modifier le CV et la lettre de
// motivation, et les télécharger autant de fois que nécessaire.
//
// Variable dédiée (NEXT_PUBLIC_PRICE_PASS) : les anciennes NEXT_PUBLIC_PRICE_NEXT
// et NEXT_PUBLIC_PRICE_PACK sont encore à 1000 / 1500 sur Vercel et ne doivent
// plus décider du prix. Pour changer le prix plus tard, modifier cette variable.
export const PASS_PRICE = Number(process.env.NEXT_PUBLIC_PRICE_PASS || 1500);
export const PASS_DAYS = 5;
export const PASS_MS = PASS_DAYS * 24 * 60 * 60 * 1000;

// "1500" -> "1 500" (formatage manuel : identique côté serveur et navigateur).
export const formatFcfa = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
