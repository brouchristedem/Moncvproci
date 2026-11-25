import { CVData, EntryItem } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { formatPeriod } from "@/lib/formatDate";

/**
 * Pièces partagées par tous les modèles pour que AUCUN champ ne disparaisse
 * selon la colonne où se trouve une rubrique (principale ou latérale).
 *
 * Avant : chaque modèle à deux colonnes avait deux rendus différents —
 * la colonne latérale n'affichait ni dates, ni lieu, ni description ; la
 * colonne principale n'affichait pas le niveau. Résultat : une rubrique
 * "Langues" placée en colonne principale perdait "Courant / Intermédiaire",
 * et une rubrique "Certifications" en colonne latérale perdait ses dates.
 */

/** Niveau (langues / compétences) — à utiliser dans la colonne principale. */
export function ItemLevel({ item, className }: { item: EntryItem; className: string }) {
  if (!item.niveau) return null;
  return <p className={className}>{item.niveau}</p>;
}

/**
 * Tout ce que la colonne latérale doit montrer EN PLUS du titre, du
 * sous-titre et du niveau : lieu, période et description.
 */
export function SidebarExtras({
  item,
  cv,
  className,
  align,
}: {
  item: EntryItem;
  cv: CVData;
  className: string;
  align?: string;
}) {
  const period = formatPeriod(item, cv.dateFormat, cv.langue);
  const cls = align ? `${className} ${align}` : className;
  return (
    <>
      {item.lieu && <p className={`${cls} italic`}>{item.lieu}</p>}
      {period && <p className={cls}>{period}</p>}
      {item.description && (
        <p className={`${cls} whitespace-pre-line`}>{renderRichText(item.description)}</p>
      )}
    </>
  );
}

/**
 * Classe de mise en page des items d'une rubrique : "ligne" (inline, séparés)
 * pour Langues / Compétences / Centres d'intérêt si choisi dans l'éditeur,
 * sinon la valeur par défaut du modèle. Utilisée aussi bien en colonne
 * principale que latérale pour que le choix de l'utilisateur soit toujours
 * respecté.
 */
export function rowLayout(
  section: { type: string; affichage?: string },
  fallback: string = ""
): string {
  return ["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne"
    ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline"
    : fallback;
}
