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

export default function Template04({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);
  const inSidebar = (s: Section) => (s.colonne ? s.colonne === "lateral" : SIDEBAR_TYPES.has(s.type));
  const sidebar = sections.filter(inSidebar);
  const main = sections.filter((s) => !inSidebar(s));

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[13px] leading-relaxed" style={{ background: cv.couleurFond }}>
      <div className="flex items-center gap-5 px-8 py-6" style={{ background: color }}>
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-20 h-20 object-cover border-2 border-white/60 flex-shrink-0 ${photoClass(
              p.photoShape
            )}`}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">
            {displayName(cv, "Prénom", "Nom")}
          </h1>
          <p className="text-white/80 text-sm">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
        </div>
      </div>
      <div className="flex justify-end gap-4 px-8 py-2 text-[11px] text-slate-500 border-b border-slate-100">
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

      <div className="flex">
        <main className="flex-[1.6] p-6 space-y-5">
          {main.map((section) => (
            <div key={section.id} className="break-inside-avoid">
              <h2 className="text-[13px] font-bold uppercase tracking-wide mb-2" style={{ color }}>
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              {section.items.length === 0 && (
                <p className="text-slate-400 italic text-[12px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              <div className={rowLayout(section)}>
{section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid mb-2">
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
        <aside className="flex-1 p-6 bg-slate-50 space-y-5">
          {sidebar.map((section) => (
            <div key={section.id} className="break-inside-avoid">
              <h2 className="text-[12px] font-bold uppercase tracking-wide mb-2" style={{ color }}>
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              {section.items.length === 0 && (
                <p className="text-slate-300 italic text-[11px]">—</p>
              )}
              <div
                className={
                  ["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne"
                    ? "flex flex-wrap gap-x-3 gap-y-1"
                    : ""
                }
              >
                {section.items.map((item) => (
                  <div key={item.id} className="break-inside-avoid mb-1.5">
                    <p className="text-[12px] font-medium">{bulletTitle(section.type, item.titre)}</p>
                    {item.sousTitre && <p className="text-[10px] text-slate-500">{item.sousTitre}</p>}
                    {item.niveau && <p className="text-[10px] text-slate-500">{item.niveau}</p>}
                    <SidebarExtras item={item} cv={cv} className="text-[10px] text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
