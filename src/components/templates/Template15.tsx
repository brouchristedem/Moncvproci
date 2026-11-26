import { CVData } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
import { displayName } from "@/lib/displayName";
import { SectionIcon } from "./SectionIcon";
import { ContactIcon } from "./ContactIcon";
import { InfoIcon } from "./InfoIcon";
import { formatPeriod } from "@/lib/formatDate";

function photoClass(shape: string) {
  if (shape === "cercle") return "rounded-full";
  if (shape === "arrondi") return "rounded-2xl";
  if (shape === "carre") return "rounded-none";
  return "";
}

function sortedVisible(cv: CVData) {
  return [...cv.sections].filter((s) => s.visible).sort((a, b) => a.ordre - b.ordre);
}

export default function Template15({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[13px] leading-relaxed p-9" style={{ background: cv.couleurFond }}>
      <div className="flex flex-col items-center text-center mb-8">
        {p.showPhoto && p.photoUrl ? (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-32 h-32 object-cover mb-4 ${photoClass(p.photoShape)}`}
            style={{ boxShadow: `0 8px 24px ${color}40` }}
          />
        ) : (
          <div
            className={`w-32 h-32 mb-4 flex items-center justify-center text-white text-3xl font-bold ${photoClass(
              p.photoShape
            )}`}
            style={{ background: color }}
          >
            {(p.prenom?.[0] || "") + (p.nom?.[0] || "")}
          </div>
        )}
        <h1 className="text-2xl font-bold">
          {displayName(cv, "Prénom", "Nom")}
        </h1>
        <p className="text-sm mt-1" style={{ color }}>
          {p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}
        </p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-700">
          {p.email && <span><ContactIcon type="email" cv={cv} />{p.email}</span>}
          {p.telephone && <span><ContactIcon type="telephone" cv={cv} />{p.telephone}</span>}
          {p.adresse && <span><ContactIcon type="adresse" cv={cv} />{p.adresse}</span>}
          {p.permis && <span><ContactIcon type="permis" cv={cv} />{cv.langue === "en" ? "Driving licence" : "Permis"} {p.permis}</span>}
            {p.linkedin && <span><ContactIcon type="linkedin" cv={cv} />{p.linkedin}</span>}
            {p.siteWeb && <span><ContactIcon type="siteWeb" cv={cv} />{p.siteWeb}</span>}
            {cv.personalInfo.autresInfos.map((info) => (
              <span key={info.id}><InfoIcon label={info.label} cv={cv} />{info.label}{info.label && info.valeur ? " : " : ""}{info.valeur}</span>
            ))}
        </div>
      </div>

      <div className="space-y-5">
        {sortedVisible(cv).map((section) => (
          <div key={section.id} className="break-inside-avoid">
            <h2
              className="text-[12px] font-bold uppercase tracking-wide mb-2 text-center pb-1"
              style={{ borderBottom: `2px solid ${color}` }}
            >
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-2"}>
              {section.items.length === 0 && (
                <p className="text-slate-600 italic text-[12px] text-center">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[11px] text-slate-600">
                        {formatPeriod(item, cv.dateFormat, cv.langue)}
                      </span>
                    )}
                  </div>
                  {(item.sousTitre || item.lieu) && (
                  <p className="text-[12px] text-slate-700">
                    {item.sousTitre && <span className="font-medium">{item.sousTitre}</span>}
                    {item.lieu && <span className="italic text-slate-600">{item.sousTitre ? " · " : ""}{item.lieu}</span>}
                  </p>
                )}
                  {item.niveau && <p className="text-[12px] text-slate-600">{item.niveau}</p>}
                  {item.description && (
                    <p className="text-[12px] text-slate-700 mt-0.5 whitespace-pre-line">
                      {renderRichText(item.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
