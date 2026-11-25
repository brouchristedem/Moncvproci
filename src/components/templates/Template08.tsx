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

export default function Template08({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);
  const inSidebar = (s: Section) => (s.colonne ? s.colonne === "lateral" : SIDEBAR_TYPES.has(s.type));
  const sidebar = sections.filter(inSidebar);
  const main = sections.filter((s) => !inSidebar(s));

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[11.5px] leading-snug p-6 flex gap-5" style={{ background: cv.couleurFond }}>
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          {p.showPhoto && p.photoUrl && (
            <img
              src={p.photoUrl}
              alt=""
              className={`w-14 h-14 object-cover flex-shrink-0 ${photoClass(p.photoShape)}`}
            />
          )}
          <div>
            <h1 className="text-lg font-bold" style={{ color }}>
              {displayName(cv, "Prénom", "Nom")}
            </h1>
            <p className="text-[11px] text-slate-500">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 space-y-0.5">
          {p.email && <p><ContactIcon type="email" cv={cv} />{p.email}</p>}
          {p.telephone && <p><ContactIcon type="telephone" cv={cv} />{p.telephone}</p>}
          {p.adresse && <p><ContactIcon type="adresse" cv={cv} />{p.adresse}</p>}
          {p.permis && <p><ContactIcon type="permis" cv={cv} />{cv.langue === "en" ? "Driving licence" : "Permis"} {p.permis}</p>}
          {p.linkedin && <p><ContactIcon type="linkedin" cv={cv} />{p.linkedin}</p>}
          {p.siteWeb && <p><ContactIcon type="siteWeb" cv={cv} />{p.siteWeb}</p>}
          {cv.personalInfo.autresInfos.map((info) => (
            <p key={info.id}><InfoIcon label={info.label} cv={cv} />{info.label}{info.label && info.valeur ? " : " : ""}{info.valeur}</p>
          ))}
        </div>
        {sidebar.map((section) => (
          <div key={section.id} className="break-inside-avoid">
            <h2
              className="text-[10px] font-bold uppercase tracking-wide mb-1.5 pb-1 border-b"
              style={{ color, borderColor: `${color}40` }}
            >
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            {section.items.length === 0 && <p className="text-slate-300 italic text-[10px]">—</p>}
            <div
              className={
                ["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne"
                  ? "flex flex-wrap gap-x-2.5 gap-y-1"
                  : ""
              }
            >
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid mb-1">
                  <p className="font-medium">{bulletTitle(section.type, item.titre)}</p>
                  {item.sousTitre && <p className="text-[9.5px] text-slate-400">{item.sousTitre}</p>}
                  {item.niveau && <p className="text-[9.5px] text-slate-400">{item.niveau}</p>}
                  <SidebarExtras item={item} cv={cv} className="text-[9.5px] text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-[1.8] space-y-4 border-l border-slate-100 pl-5">
        {main.map((section) => (
          <div key={section.id} className="break-inside-avoid">
            <h2 className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color }}>
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            {section.items.length === 0 && (
              <p className="text-slate-300 italic text-[10.5px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
            )}
            <div className={rowLayout(section)}>
{section.items.map((item) => (
              <div key={item.id} className="break-inside-avoid mb-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                  {(item.dateDebut || item.dateFin) && (
                    <span className="text-[9.5px] text-slate-400">
                      {formatPeriod(item, cv.dateFormat, cv.langue)}
                    </span>
                  )}
                </div>
                {(item.sousTitre || item.lieu) && (
                  <p className="text-[10.5px] text-slate-500">
                    {item.sousTitre && <span className="font-medium">{item.sousTitre}</span>}
                    {item.lieu && <span className="italic text-slate-400">{item.sousTitre ? " · " : ""}{item.lieu}</span>}
                  </p>
                )}
                <ItemLevel item={item} className="text-[10.5px] text-slate-500" />
                {item.description && (
                  <p className="text-[10.5px] text-slate-500 whitespace-pre-line">{renderRichText(item.description)}</p>
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
