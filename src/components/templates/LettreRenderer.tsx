import { CVData } from "@/lib/types";
import { displayName } from "@/lib/displayName";
import { ContactIcon } from "./ContactIcon";

// Rendu de la lettre de motivation, en A4, assorti au CV : même couleur
// primaire, même police système, en-tête reprenant nom/coordonnées comme sur
// le CV. Volontairement un rendu unique (pas un par modèle de CV) : ce qui
// distingue une bonne lettre, c'est le contenu écrit par la personne, pas 15
// variantes de mise en page — et ça évite de dupliquer la maintenance sur 15
// templates pour un gain visuel marginal.
export default function LettreRenderer({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color, lettreMotivation: l } = cv;
  const isEn = cv.langue === "en";
  const today = new Date();
  const dateStr = today.toLocaleDateString(isEn ? "en-GB" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const objet = l?.poste
    ? isEn
      ? `Application for the position of ${l.poste}`
      : `Candidature au poste de ${l.poste}`
    : "";

  return (
    <div
      className="w-full text-slate-800 p-10 font-sans text-[13px] leading-relaxed"
      style={{
        background: cv.couleurFond,
        minHeight: "297mm",
        boxSizing: "border-box",
        // Lettre de plus d'une page : le padding (marges) et le fond sont
        // répétés sur chaque page au lieu de coller au bord du papier.
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
      }}
    >
      {/* En-tête : identique en esprit à l'en-tête du CV, pour que les deux
          documents se lisent comme un même dossier. */}
      <div className="flex items-start justify-between gap-6 mb-8 pb-6" style={{ borderBottom: `3px solid ${color}` }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color }}>
            {displayName(cv, isEn ? "First name" : "Prénom", isEn ? "Last name" : "Nom")}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{p.titre}</p>
          <div className="flex flex-col gap-0.5 mt-2 text-[11px] text-slate-700">
            {p.email && (
              <span>
                <ContactIcon type="email" cv={cv} />
                {p.email}
              </span>
            )}
            {p.telephone && (
              <span>
                <ContactIcon type="telephone" cv={cv} />
                {p.telephone}
              </span>
            )}
            {p.adresse && (
              <span>
                <ContactIcon type="adresse" cv={cv} />
                {p.adresse}
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-700 whitespace-nowrap">
          {(l?.ville || "") + (l?.ville ? ", " : "") + dateStr}
        </div>
      </div>

      {/* Bloc destinataire */}
      {(l?.entreprise || l?.destinataire) && (
        <div className="mb-6 text-[12px] text-slate-700">
          {l?.destinataire && <p>{l.destinataire}</p>}
          {l?.entreprise && <p className="font-medium">{l.entreprise}</p>}
        </div>
      )}

      {objet && (
        <p className="mb-6 text-[12px] font-semibold" style={{ color }}>
          {isEn ? "Subject: " : "Objet : "}
          {objet}
        </p>
      )}

      <div className="mb-6 text-[13px] font-medium text-slate-900">
        {isEn ? "Dear Sir/Madam," : "Madame, Monsieur,"}
      </div>

      {/* Corps de la lettre : texte libre saisi par la personne, avec
          conservation des sauts de ligne (whitespace-pre-wrap) comme dans un
          traitement de texte classique. */}
      <div className="whitespace-pre-wrap text-[13px] leading-7 text-slate-800 min-h-[200px]">
        {l?.corps || ""}
      </div>

      <div className="mt-10 text-[13px] text-slate-800">
        <p>{isEn ? "Sincerely," : "Cordialement,"}</p>
        <p className="mt-6 font-semibold" style={{ color }}>
          {displayName(cv, isEn ? "First name" : "Prénom", isEn ? "Last name" : "Nom")}
        </p>
      </div>
    </div>
  );
}
