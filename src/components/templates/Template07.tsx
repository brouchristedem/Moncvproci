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
  if (shape === "arrondi") return "rounded-xl";
  if (shape === "carre") return "rounded-none";
  return "";
}

function sortedVisible(cv: CVData) {
  return [...cv.sections].filter((s) => s.visible).sort((a, b) => a.ordre - b.ordre);
}

export default function Template07({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;

  return (
    <div className="w-full min-h-full text-slate-800 p-12 font-sans text-[13px] leading-relaxed" style={{ background: cv.couleurFond }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-4xl font-serif tracking-tight">
            {displayName(cv, "Prénom", "Nom")}
          </h1>
          <p className="text-[13px] tracking-[0.3em] uppercase text-slate-600 mt-2">
            {p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}
          </p>
        </div>
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-20 h-20 object-cover flex-shrink-0 ${photoClass(p.photoShape)}`}
          />
        )}
      </div>
      <div
        className="h-[2px] w-full my-5"
        style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
      />
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-700 mb-8">
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

      <div className="space-y-6">
        {sortedVisible(cv).map((section) => (
          <div key={section.id} className="break-inside-avoid">
            <h2 className="text-[12px] font-serif italic mb-3" style={{ color }}>
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-3"}>
              {section.items.length === 0 && (
                <p className="text-slate-600 italic text-[12px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-[13px]">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[10px] text-slate-600 uppercase tracking-wide">
                        {formatPeriod(item, cv.dateFormat, cv.langue)}
                      </span>
                    )}
                  </div>
                  {item.sousTitre && (
                    <p className="text-[12px] text-slate-700">
                      <span className="font-medium">{item.sousTitre}</span>
                      {item.lieu && <span className="italic text-slate-600">, {item.lieu}</span>}
                    </p>
                  )}
                  {item.niveau && <p className="text-[12px] text-slate-600">{item.niveau}</p>}
                  {item.description && (
                    <p className="text-[12px] text-slate-700 mt-1 whitespace-pre-line">
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
