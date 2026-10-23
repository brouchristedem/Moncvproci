// Prix du flux CinetPay (en FCFA). Source unique, utilisée à la fois par
// l'interface et par le serveur : le montant envoyé à CinetPay est toujours
// recalculé côté serveur à partir du "plan", jamais lu depuis le navigateur.
//
// Les frais CinetPay (transaction + transfert) sont inclus dans ces prix :
// 1000 F net -> ~1050 F, 1500 F net -> ~1575 F.
export type CinetPayPlan = "cv" | "pack";

export const CINETPAY_PRICES: Record<CinetPayPlan, number> = {
  cv: 1050,
  pack: 1575,
};

export function isCinetPayPlan(v: unknown): v is CinetPayPlan {
  return v === "cv" || v === "pack";
}
