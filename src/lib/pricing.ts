// Offres de moncvproci. Les prix et durées sont décidés ICI (jamais envoyés
// par le navigateur) : le serveur relit ces valeurs pour créer et vérifier
// un paiement.
//
//   cv      : CV seul, modifications et téléchargements pendant 24 h, sans lettre
//   pack30  : CV + lettre de motivation, 30 jours
//   pack365 : CV + lettre de motivation, 1 an
//
// Les prix sont distincts, ce qui permet de retrouver l'offre à partir du
// montant payé (voir offerFromAmount).
export type OfferId = "cv" | "pack30" | "pack365";

export interface Offer {
  id: OfferId;
  price: number;
  ms: number;
  lettre: boolean;
  label: string;
  duration: string;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const OFFERS: Record<OfferId, Offer> = {
  cv: { id: "cv", price: 1000, ms: 24 * HOUR, lettre: false, label: "CV seul", duration: "24 h" },
  pack30: { id: "pack30", price: 2000, ms: 30 * DAY, lettre: true, label: "Pack 30 jours", duration: "30 jours" },
  pack365: { id: "pack365", price: 10000, ms: 365 * DAY, lettre: true, label: "Pack 1 an", duration: "1 an" },
};

export const OFFER_LIST: Offer[] = [OFFERS.cv, OFFERS.pack30, OFFERS.pack365];

export function isOfferId(v: unknown): v is OfferId {
  return v === "cv" || v === "pack30" || v === "pack365";
}

export function offerFromAmount(amount: number): Offer | null {
  return OFFER_LIST.find((o) => o.price === amount) ?? null;
}

// "1500" -> "1 500" (formatage manuel : identique côté serveur et navigateur).
export const formatFcfa = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
