import { CVData, Section } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
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

export default function Template12({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);
  const inSidebar = (s: Section) => (s.colonne ? s.colonne === "lateral" : SIDEBAR_TYPES.has(s.type));
  const sidebar = sections.filter(inSidebar);
  const main = sections.filter((s) => !inSidebar(s));

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[12.5px] leading-relaxed p-8" style={{ background: cv.couleurFond }}>
      <div className="flex justify-between items-start border-b-2 pb-4 mb-6" style={{ borderColor: color }}>
        <div className="flex items-center gap-4">
          {p.showPhoto && p.photoUrl && (
            <img
              src={p.photoUrl}
              alt=""
              className={`w-16 h-16 object-cover ${photoClass(p.photoShape)}`}
            />
          )}
          <div>
            <h1 className="text-xl font-bold uppercase">
              {cv.ordreNom === "nom-prenom" ? (
              <>{p.nom || "NOM"}, {p.prenom || "Prénom"}</>
            ) : (
              <>{p.prenom || "Prénom"} {p.nom || "NOM"}</>
            )}
            </h1>
            <p className="text-[12px] text-slate-700">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
          </div>
        </div>
        <div className="text-right text-[10.5px] text-slate-700">
          {p.email && <p><ContactIcon type="email" cv={cv} />{p.email}</p>}
          {p.telephone && <p><ContactIcon type="telephone" cv={cv} />{p.telephone}</p>}
          {p.adresse && <p><ContactIcon type="adresse" cv={cv} />{p.adresse}</p>}
          {p.permis && <p><ContactIcon type="permis" cv={cv} />{cv.langue === "en" ? "Driving licence" : "Permis"}: {p.permis}</p>}
          {p.linkedin && <p><ContactIcon type="linkedin" cv={cv} />{p.linkedin}</p>}
          {p.siteWeb && <p><ContactIcon type="siteWeb" cv={cv} />{p.siteWeb}</p>}
          {cv.personalInfo.autresInfos.map((info) => (
            <p key={info.id}><InfoIcon label={info.label} cv={cv} />{info.label}{info.label && info.valeur ? " : " : ""}{info.valeur}</p>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-[1.7] space-y-4">
          {main.map((section) => (
            <div key={section.id} className="break-inside-avoid">
              <h2
                className="text-[11px] font-bold uppercase tracking-widest mb-2 pb-1 border-b border-slate-200"
              >
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              {section.items.length === 0 && (
                <p className="text-slate-600 italic text-[11.5px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
              )}
              <div className={rowLayout(section)}>
{section.items.map((item) => (
                <div key={item.id} className="break-inside-avoid mb-2 grid grid-cols-[1fr_auto] gap-2">
                  <div>
                    <p className="font-semibold">{bulletTitle(section.type, item.titre)}</p>
                    {(item.sousTitre || item.lieu) && (
                  <p className="text-[11.5px] text-slate-700">
                    {item.sousTitre && <span className="font-medium">{item.sousTitre}</span>}
                    {item.lieu && <span className="italic text-slate-600">{item.sousTitre ? " · " : ""}{item.lieu}</span>}
                  </p>
                )}
                    <ItemLevel item={item} className="text-[11.5px] text-slate-700" />
                    {item.description && (
                      <p className="text-[11.5px] text-slate-700 mt-0.5 whitespace-pre-line">
                        {renderRichText(item.description)}
                      </p>
                    )}
                  </div>
                  {(item.dateDebut || item.dateFin) && (
                    <span className="text-[10.5px] text-slate-600 whitespace-nowrap">
                      {formatPeriod(item, cv.dateFormat, cv.langue, "-")}
                    </span>
                  )}
                </div>
              ))}
</div>
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-4">
          {sidebar.map((section) => (
            <div key={section.id} className="break-inside-avoid">
              <h2
                className="text-[11px] font-bold uppercase tracking-widest mb-2 pb-1 border-b border-slate-200"
                style={{ color }}
              >
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
                    <p className="font-medium text-[11.5px]">{bulletTitle(section.type, item.titre)}</p>
                    {item.sousTitre && <p className="text-[10.5px] text-slate-600">{item.sousTitre}</p>}
                    {item.niveau && <p className="text-[10.5px] text-slate-600">{item.niveau}</p>}
                    <SidebarExtras item={item} cv={cv} className="text-[10.5px] text-slate-600" />
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
