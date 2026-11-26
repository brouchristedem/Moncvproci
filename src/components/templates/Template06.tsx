import { CVData, Section } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
import { displayName } from "@/lib/displayName";
import { SectionIcon } from "./SectionIcon";
import { ContactIcon } from "./ContactIcon";
import { InfoIcon } from "./InfoIcon";
import { formatPeriod } from "@/lib/formatDate";
import { ItemLevel, SidebarExtras } from "./ItemParts";

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

export default function Template06({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);
  const inSidebar = (s: Section) => (s.colonne ? s.colonne === "lateral" : SIDEBAR_TYPES.has(s.type));
  const sidebar = sections.filter(inSidebar);
  const main = sections.filter((s) => !inSidebar(s));

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[13px] leading-relaxed" style={{ background: cv.couleurFond }}>
      <div className="flex items-center gap-2 px-6 pt-5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        <span className="ml-2 text-[10px] font-mono text-slate-600">profil.json</span>
      </div>

      <div className="flex items-center gap-4 mx-6 mt-3 mb-6 pb-4 border-b-2" style={{ borderColor: color }}>
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-16 h-16 object-cover flex-shrink-0 ${photoClass(p.photoShape)}`}
          />
        )}
        <div>
          <h1 className="text-xl font-bold font-mono" style={{ color }}>
            {displayName(cv, "Prénom", "Nom")}
          </h1>
          <p className="text-[12px] text-slate-700 font-mono">
            {"<"}{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}{" />"}
          </p>
        </div>
      </div>

      <div className="flex px-6 pb-6 gap-6">
        <main className="flex-[1.7] space-y-5">
          {main.map((section) => (
            <div key={section.id} className="break-inside-avoid">
              <h2 className="text-[12px] font-bold uppercase tracking-wide mb-2 font-mono flex items-center gap-1.5" style={{ color }}>
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              {section.items.length === 0 && (
                <p className="text-slate-600 italic text-[12px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              {section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid mb-2 pl-3 border-l-2 border-slate-100">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold">{bulletTitle(section.type, item.titre)}</span>
                    {(item.dateDebut || item.dateFin) && (
                      <span className="text-[10px] text-slate-600 font-mono">
                        {formatPeriod(item, cv.dateFormat, cv.langue, "-")}
                      </span>
                    )}
                  </div>
                  {(item.sousTitre || item.lieu) && (
                  <p className="text-[12px] text-slate-700">
                    {item.sousTitre && <span className="font-medium">{item.sousTitre}</span>}
                    {item.lieu && <span className="italic text-slate-600">{item.sousTitre ? " · " : ""}{item.lieu}</span>}
                  </p>
                )}
                  <ItemLevel item={item} className="text-[12px] text-slate-700" />
                  {item.description && (
                    <p className="text-[12px] text-slate-700 mt-0.5 whitespace-pre-line">
                      {renderRichText(item.description)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </main>

        <aside className="flex-1 rounded-lg p-4" style={{ background: `${color}0d` }}>
          <div className="text-[11px] space-y-1.5 mb-5 text-slate-600">
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
            <div key={section.id} className="break-inside-avoid mb-5">
              <h2 className="text-[11px] font-bold uppercase tracking-wide mb-2 font-mono" style={{ color }}>
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              {["langues", "competences", "interets"].includes(section.type) ? (
                <div className={section.affichage === "liste" ? "flex flex-col gap-1.5 items-start" : "flex flex-wrap gap-1.5"}>
                  {section.items.length === 0 && <p className="text-[11px] text-slate-600 italic">—</p>}
                  {section.items.map((item) => (
                    <span
                      key={item.id}
                      className="text-[10px] px-2 py-1 rounded font-mono bg-white border"
                      style={{ borderColor: `${color}40`, color }}
                    >
                      {bulletTitle(section.type, item.titre)}
                      {item.sousTitre && <span className="opacity-70"> · {item.sousTitre}</span>}
                      {item.niveau && <span className="opacity-70"> · {item.niveau}</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {section.items.length === 0 && <p className="text-[11px] text-slate-600 italic">—</p>}
                  {section.items.map((item) => (
                    <div key={item.id} className="break-inside-avoid">
                      <p className="text-[11px] font-semibold font-mono" style={{ color }}>
                        {bulletTitle(section.type, item.titre)}
                      </p>
                      {item.sousTitre && <p className="text-[10px] text-slate-700">{item.sousTitre}</p>}
                      {item.niveau && <p className="text-[10px] text-slate-700">{item.niveau}</p>}
                      <SidebarExtras item={item} cv={cv} className="text-[10px] text-slate-700" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
