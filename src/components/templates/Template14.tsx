import { CVData, Section } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
import { displayName } from "@/lib/displayName";
import { SectionIcon } from "./SectionIcon";
import { ContactIcon } from "./ContactIcon";
import { InfoIcon } from "./InfoIcon";
import { formatPeriod } from "@/lib/formatDate";
import { ItemLevel, SidebarExtras, rowLayout } from "./ItemParts";

function photoClass(shape: string) {
  if (shape === "cercle") return "rounded-full";
  if (shape === "arrondi") return "rounded-xl";
  if (shape === "carre") return "rounded-none";
  return "";
}

function sortedVisible(cv: CVData) {
  return [...cv.sections].filter((s) => s.visible).sort((a, b) => a.ordre - b.ordre);
}

const SIDEBAR_TYPES = new Set(["langues", "competences", "certifications", "interets", "references"]);

export default function Template14({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);
  const inSidebar = (s: Section) => (s.colonne ? s.colonne === "lateral" : SIDEBAR_TYPES.has(s.type));
  const sidebar = sections.filter(inSidebar);
  const main = sections.filter((s) => !inSidebar(s));

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[12.5px] leading-relaxed p-7 border-[10px]" style={{ borderColor: `${color}12`, background: cv.couleurFond }}>
      <div className="flex items-center gap-4 mb-6">
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-16 h-16 object-cover border ${photoClass(p.photoShape)}`}
            style={{ borderColor: color }}
          />
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color }}>
            {displayName(cv, "Prénom", "Nom")}
          </h1>
          <p className="text-[12px] text-slate-500">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
        </div>
        <div className="text-right text-[10.5px] text-slate-500">
          {p.email && <p><ContactIcon type="email" cv={cv} />{p.email}</p>}
          {p.telephone && <p><ContactIcon type="telephone" cv={cv} />{p.telephone}</p>}
        </div>
      </div>
      {(p.adresse || p.permis) && (
        <p className="flex flex-wrap gap-x-3 text-[10.5px] text-slate-400 mb-5">
          {p.adresse && <span><ContactIcon type="adresse" cv={cv} />{p.adresse}</span>}
          {p.permis && <span><ContactIcon type="permis" cv={cv} />{cv.langue === "en" ? "Driving licence" : "Permis"} {p.permis}</span>}
        </p>
      )}
      {(p.linkedin || p.siteWeb || cv.personalInfo.autresInfos.length > 0) && (
        <p className="flex flex-wrap gap-x-3 text-[10.5px] text-slate-400 mb-5">
          {p.linkedin && <span><ContactIcon type="linkedin" cv={cv} />{p.linkedin}</span>}
          {p.siteWeb && <span><ContactIcon type="siteWeb" cv={cv} />{p.siteWeb}</span>}
          {cv.personalInfo.autresInfos.map((info) => (
            <span key={info.id}><InfoIcon label={info.label} cv={cv} />{info.label}{info.label && info.valeur ? " : " : ""}{info.valeur}</span>
          ))}
        </p>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          {main.map((section) => (
            <div key={section.id} className="break-inside-avoid border border-slate-200 rounded-lg p-3">
              <h2 className="text-[11px] font-bold uppercase mb-2" style={{ color }}>
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              {section.items.length === 0 && (
                <p className="text-slate-300 italic text-[11.5px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              <div className={rowLayout(section)}>
{section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid mb-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[10px] text-slate-400">
                        {formatPeriod(item, cv.dateFormat, cv.langue)}
                      </span>
                    )}
                  </div>
                  {(item.sousTitre || item.lieu) && (
                  <p className="text-[11.5px] text-slate-500">
                    {item.sousTitre && <span className="font-medium">{item.sousTitre}</span>}
                    {item.lieu && <span className="italic text-slate-400">{item.sousTitre ? " · " : ""}{item.lieu}</span>}
                  </p>
                )}
                  <ItemLevel item={item} className="text-[11.5px] text-slate-500" />
                  {item.description && (
                    <p className="text-[11.5px] text-slate-500 mt-0.5 whitespace-pre-line">
                      {renderRichText(item.description)}
                    </p>
                  )}
                </div>
              ))}
</div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {sidebar.map((section) => (
            <div key={section.id} className="break-inside-avoid border border-slate-200 rounded-lg p-3">
              <h2 className="text-[11px] font-bold uppercase mb-2" style={{ color }}>
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              <div
                className={
                  ["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne"
                    ? "flex flex-wrap gap-x-2.5 gap-y-1"
                    : ""
                }
              >
                {section.items.map((item) => (
                  <div key={item.id} className="break-inside-avoid mb-1">
                    <p className="text-[11px] font-medium">{bulletTitle(section.type, item.titre)}</p>
                    {item.sousTitre && <p className="text-[10px] text-slate-400">{item.sousTitre}</p>}
                    {item.niveau && <p className="text-[10px] text-slate-400">{item.niveau}</p>}
                    <SidebarExtras item={item} cv={cv} className="text-[10px] text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
