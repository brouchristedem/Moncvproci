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

export default function Template13({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[13px] leading-relaxed" style={{ background: cv.couleurFond }}>
      <div
        className="px-8 py-8 rounded-b-[2.5rem]"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      >
        <div className="flex items-center gap-5">
          {p.showPhoto && p.photoUrl && (
            <img
              src={p.photoUrl}
              alt=""
              className={`w-20 h-20 object-cover border-4 border-white/40 ${photoClass(p.photoShape)}`}
            />
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              {displayName(cv, "Prénom", "Nom")}
            </h1>
            <p className="text-white/85 text-sm">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-white/80">
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

      <div className="px-8 py-6 space-y-4">
        {sortedVisible(cv).map((section) => (
          <div key={section.id} className="break-inside-avoid rounded-2xl p-4" style={{ background: `${color}0d` }}>
            <h2 className="text-[12.5px] font-bold uppercase mb-2" style={{ color }}>
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-2"}>
              {section.items.length === 0 && (
                <p className="text-slate-300 italic text-[12px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[10.5px] text-slate-400">
                        {formatPeriod(item, cv.dateFormat, cv.langue)}
                      </span>
                    )}
                  </div>
                  {(item.sousTitre || item.lieu) && (
                  <p className="text-[12px] text-slate-500">
                    {item.sousTitre && <span className="font-medium">{item.sousTitre}</span>}
                    {item.lieu && <span className="italic text-slate-400">{item.sousTitre ? " · " : ""}{item.lieu}</span>}
                  </p>
                )}
                  {item.niveau && <p className="text-[12px] text-slate-400">{item.niveau}</p>}
                  {item.description && (
                    <p className="text-[12px] text-slate-500 mt-0.5 whitespace-pre-line">
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
