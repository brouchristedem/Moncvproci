const MONTHS_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];
const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formate une date stockée en "YYYY-MM" (venant d'un <input type="month">)
 * selon le format choisi. Si la valeur ne correspond pas à ce format
 * (ancien texte libre saisi avant cette fonctionnalité), elle est affichée
 * telle quelle pour ne rien casser.
 */
export function formatDate(
  value: string | undefined,
  format: "texte" | "numerique",
  langue: "fr" | "en"
): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value; // texte libre existant, non reformatable

  const [, year, month] = match;
  if (format === "numerique") {
    return `${month}/${year}`;
  }
  const monthIndex = parseInt(month, 10) - 1;
  const months = langue === "en" ? MONTHS_EN : MONTHS_FR;
  const monthLabel = months[monthIndex] || month;
  return `${monthLabel} ${year}`;
}

/**
 * Période d'un élément ("Jan 2022 — Aujourd'hui"). Centralisée pour que tous
 * les modèles affichent exactement la même chose, dans la langue du CV.
 * Retourne une chaîne vide s'il n'y a aucune date.
 */
export function formatPeriod(
  item: { dateDebut?: string; dateFin?: string; enCours?: boolean },
  format: "texte" | "numerique",
  langue: "fr" | "en",
  separator: string = "—"
): string {
  if (!item.dateDebut && !item.dateFin && !item.enCours) return "";
  const debut = formatDate(item.dateDebut, format, langue);
  const fin = item.enCours
    ? langue === "en"
      ? "Present"
      : "Aujourd'hui"
    : formatDate(item.dateFin, format, langue);
  if (debut && fin) return `${debut} ${separator} ${fin}`;
  return debut || fin;
}
