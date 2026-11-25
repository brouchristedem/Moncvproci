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

const SIDEBAR_TYPES = new Set(["langues", "competences", "certifications", "interets"]);

export default function Template02({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);
  const inSidebar = (s: Section) => (s.colonne ? s.colonne === "lateral" : SIDEBAR_TYPES.has(s.type));
  const sidebar = sections.filter(inSidebar);
  const main = sections.filter((s) => !inSidebar(s));

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[13px] leading-relaxed flex" style={{ background: cv.couleurFond }}>
      <aside className="w-[34%] p-6 text-white flex-shrink-0" style={{ background: color }}>
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-20 h-20 object-cover mb-4 ${photoClass(p.photoShape)}`}
          />
        )}
        <h1 className="text-lg font-bold leading-tight">
          {displayName(cv, "Prénom", "Nom")}
        </h1>
        <p className="text-[12px] opacity-90 mt-1">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>

        <div className="mt-5 space-y-1 text-[11px] opacity-90 break-words">
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
          <div key={section.id} className="break-inside-avoid mt-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wide border-b border-white/30 pb-1 mb-2">
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            {section.items.length === 0 && (
              <p className="text-[11px] opacity-60 italic">—</p>
            )}
            {section.items.map((item) => (
              <div key={item.id} className="break-inside-avoid mb-1.5">
                <p className="text-[12px] font-medium">{bulletTitle(section.type, item.titre)}</p>
                {item.sousTitre && <p className="text-[10px] opacity-80">{item.sousTitre}</p>}
                {item.niveau && <p className="text-[10px] opacity-80">{item.niveau}</p>}
                <SidebarExtras item={item} cv={cv} className="text-[10px] opacity-80" />
              </div>
            ))}
          </div>
        ))}
      </aside>

      <main className="flex-1 p-6 space-y-5">
        {main.map((section) => (
          <div key={section.id} className="break-inside-avoid">
            <h2 className="text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color }}>
              <SectionIcon type={section.type} cv={cv} />{section.titre}
            </h2>
            <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-2"}>
              {section.items.length === 0 && (
                <p className="text-slate-400 italic text-[12px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[11px] text-slate-500">
                        {formatPeriod(item, cv.dateFormat, cv.langue)}
                      </span>
                    )}
                  </div>
                  {item.sousTitre && (
                    <p className="text-[12px] text-slate-600">
                      <span className="font-medium">{item.sousTitre}</span>
                      {item.lieu && <span className="italic text-slate-400"> · {item.lieu}</span>}
                    </p>
                  )}
                  <ItemLevel item={item} className="text-[12px] text-slate-500" />
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
      </main>
    </div>
  );
}
