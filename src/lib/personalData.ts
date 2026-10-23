// Détection et masquage des coordonnées (email, téléphone, liens) avant tout
// envoi de texte à un service d'IA tiers. Utilisé côté navigateur ET côté serveur.

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /(?:https?:\/\/|www\.)[^\s)]+|(?:linkedin\.com|github\.com)\/[^\s)]+/gi;
// Espaces et tabulations seulement (pas de retour à la ligne) : un numéro ne
// s'étend jamais sur plusieurs lignes, et on évite d'avaler des dates voisines.
const PHONE_RE = /(?:\+|00)?\d[\d \t().-]{6,}\d/g;
// "2019 - 2022" a 8 chiffres mais n'est pas un téléphone.
const YEAR_RANGE_RE = /^(?:(?:19|20)\d{2}[\s.,/-]*)+$/;

function isPhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 && !YEAR_RANGE_RE.test(candidate.trim());
}

export function maskPersonalData(text: string): string {
  return text
    .replace(EMAIL_RE, "[email]")
    .replace(URL_RE, "[lien]")
    .replace(PHONE_RE, (m) => (isPhone(m) ? "[tel]" : m));
}

export interface Contacts {
  email: string;
  telephone: string;
  linkedin: string;
  siteWeb: string;
}

// Retrouve les coordonnées dans le texte brut, localement : elles ne quittent
// jamais le navigateur et sont remises dans l'éditeur sans passer par l'IA.
export function extractContacts(text: string): Contacts {
  const email = (text.match(EMAIL_RE) || [])[0] || "";

  let telephone = "";
  for (const m of text.match(PHONE_RE) || []) {
    if (isPhone(m)) {
      telephone = m.trim();
      break;
    }
  }

  const urls = (text.match(URL_RE) || []).map((u) => u.replace(/[.,;]+$/, ""));
  const linkedin = urls.find((u) => /linkedin\.com/i.test(u)) || "";
  const siteWeb = urls.find((u) => !/linkedin\.com/i.test(u)) || "";

  return { email, telephone, linkedin, siteWeb };
}
