import { CVData } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
import { displayName } from "@/lib/displayName";
import { SectionIcon } from "./SectionIcon";
import { ContactIcon } from "./ContactIcon";
import { InfoIcon } from "./InfoIcon";
import { formatPeriod } from "@/lib/formatDate";

function sortedVisible(cv: CVData) {
  return [...cv.sections].filter((s) => s.visible).sort((a, b) => a.ordre - b.ordre);
}

function photoClass(shape: string) {
  if (shape === "cercle") return "rounded-full";
  if (shape === "arrondi") return "rounded-xl";
  if (shape === "carre") return "rounded-none";
  return "";
}

export default function Template09({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;

  return (
    <div className="w-full min-h-full text-slate-800 p-10 font-sans text-[13px] leading-relaxed" style={{ background: cv.couleurFond }}>
      <div className="text-center pb-5 mb-6 border-b-4 double" style={{ borderColor: color }}>
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-20 h-20 object-cover mx-auto mb-3 ${photoClass(p.photoShape)}`}
          />
        )}
        <h1 className="text-2xl font-bold uppercase tracking-wide">
          {displayName(cv, "Prénom", "Nom")}
        </h1>
        <p className="text-sm text-slate-700 mt-1">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
        <div className="flex justify-center flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[11px] text-slate-700">
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
              className="text-[12px] font-bold uppercase tracking-widest text-center mb-3 py-1"
              style={{ background: `${color}10`, color }}
            >
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-2.5"}>
              {section.items.length === 0 && (
                <p className="text-slate-600 italic text-[12px] text-center">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[11px] text-slate-700 italic">
                        {formatPeriod(item, cv.dateFormat, cv.langue)}
                      </span>
                    )}
                  </div>
                  {item.sousTitre && (
                    <p className="text-[12px] text-slate-600">
                      <span className="font-medium">{item.sousTitre}</span>
                      {item.lieu && <span className="italic text-slate-600">, {item.lieu}</span>}
                    </p>
                  )}
                  {item.niveau && <p className="text-[12px] text-slate-700">{item.niveau}</p>}
                  {item.description && (
                    <p className="text-[12px] text-slate-600 mt-0.5 whitespace-pre-line">
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
