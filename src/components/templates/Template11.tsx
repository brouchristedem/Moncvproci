import { CVData } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
import { displayName } from "@/lib/displayName";
import { SectionIcon } from "./SectionIcon";
import { ContactIcon } from "./ContactIcon";
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

export default function Template11({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;
  const sections = sortedVisible(cv);

  return (
    <div className="w-full min-h-full text-slate-800 p-10 font-sans text-[13px] leading-relaxed" style={{ background: cv.couleurFond }}>
      <div className="grid grid-cols-[auto_1fr] gap-6 items-center mb-8">
        {p.showPhoto && p.photoUrl && (
          <img
            src={p.photoUrl}
            alt=""
            className={`w-20 h-20 object-cover ${photoClass(p.photoShape)}`}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {displayName(cv, "Prénom", "Nom")}
          </h1>
          <p className="text-sm" style={{ color }}>
            {p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-[10.5px] text-slate-700 mb-8 pb-4 border-b border-slate-200">
        {p.email && <div><p className="text-[9px] uppercase text-slate-600">Email</p>{p.email}</div>}
        {p.telephone && <div><p className="text-[9px] uppercase text-slate-600">Téléphone</p>{p.telephone}</div>}
        {p.adresse && <div><p className="text-[9px] uppercase text-slate-600">Adresse</p>{p.adresse}</div>}
        {p.permis && <div><p className="text-[9px] uppercase text-slate-600">{cv.langue === "en" ? "Licence" : "Permis"}</p>{p.permis}</div>}
        {p.linkedin && <div><p className="text-[9px] uppercase text-slate-600">LinkedIn</p>{p.linkedin}</div>}
        {p.siteWeb && <div><p className="text-[9px] uppercase text-slate-600">Web</p>{p.siteWeb}</div>}
        {cv.personalInfo.autresInfos.map((info) => (
          <div key={info.id}><p className="text-[9px] uppercase text-slate-600">{info.label}</p>{info.valeur}</div>
        ))}
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <div key={section.id} className="break-inside-avoid grid grid-cols-[32px_1fr] gap-3">
            <span className="text-lg font-bold" style={{ color: `${color}` }}>
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-[12px] font-bold uppercase tracking-wide mb-2"><SectionIcon type={section.type} cv={cv} />{section.titre}</h2>
              <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-2"}>
                {section.items.length === 0 && (
                  <p className="text-slate-600 italic text-[12px]">{cv.langue === "en" ? "No information added" : "Aucune information ajoutée"}</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}
