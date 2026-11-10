// Référence du paiement GeniusPay en cours, gardée sur l'appareil pour pouvoir
// débloquer le téléchargement au retour du checkout.
//
// Avant, seule la référence était stockée, sans date, et elle n'était
// supprimée que si le paiement aboutissait ou échouait officiellement. Une
// personne qui ouvrait le paiement puis renonçait (retour arrière) gardait
// donc une référence « en attente » pour toujours : à chaque ouverture de
// « Télécharger », le bandeau bleu « Vérification de votre paiement… »
// réapparaissait, et l'éditeur rouvrait tout seul le panneau. On horodate
// maintenant la référence pour distinguer un paiement qui vient d'être lancé
// d'un paiement abandonné.
export const GP_STORAGE_KEY = "gp_pending_reference";

// Au-delà de cette durée sans confirmation, un paiement non abouti est
// considéré comme abandonné et la référence est oubliée.
export const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

export interface PendingPayment {
  ref: string;
  // 0 = ancienne référence enregistrée sans date (version précédente du site).
  ts: number;
}

export function savePendingPayment(ref: string) {
  try {
    localStorage.setItem(GP_STORAGE_KEY, JSON.stringify({ ref, ts: Date.now() }));
  } catch {}
}

export function readPendingPayment(): PendingPayment | null {
  try {
    const raw = localStorage.getItem(GP_STORAGE_KEY);
    if (!raw) return null;
    if (raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as Partial<PendingPayment>;
      if (typeof parsed.ref === "string" && parsed.ref) {
        return { ref: parsed.ref, ts: Number(parsed.ts) || 0 };
      }
      localStorage.removeItem(GP_STORAGE_KEY);
      return null;
    }
    // Ancien format : la référence seule.
    return { ref: raw, ts: 0 };
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try {
    localStorage.removeItem(GP_STORAGE_KEY);
  } catch {}
}

// Un paiement lancé il y a moins de 30 minutes : la personne peut encore être
// en train de le valider (par exemple sur son téléphone Mobile Money).
export function isFreshPayment(p: PendingPayment): boolean {
  return p.ts > 0 && Date.now() - p.ts < PENDING_MAX_AGE_MS;
}

// Valeur du paramètre « gp » de l'URL de retour du checkout (?gp=success ou
// ?gp=error), ou null si la personne n'arrive pas depuis le checkout.
export function checkoutReturnParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("gp");
  } catch {
    return null;
  }
}

// Retire ?gp=... de l'adresse une fois le retour traité, pour qu'un
// rechargement de la page ne rejoue pas le message.
export function stripCheckoutReturnParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("gp")) return;
    url.searchParams.delete("gp");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {}
}
