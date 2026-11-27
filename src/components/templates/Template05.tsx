import { CVData } from "@/lib/types";
import { renderRichText } from "@/lib/richText";
import { bulletTitle } from "@/lib/bulletTitle";
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

export default function Template05({ cv }: { cv: CVData }) {
  const { personalInfo: p, couleurPrimaire: color } = cv;

  return (
    <div className="w-full min-h-full text-slate-800 font-sans text-[13px] leading-relaxed relative" style={{ background: cv.couleurFond }}>
      <div
        className="absolute top-0 bottom-0 left-0 w-3"
        style={{ background: color }}
      />
      <div className="pl-10 pr-8 py-8">
        <div className="flex items-center gap-5 mb-8">
          {p.showPhoto && p.photoUrl && (
            <img
              src={p.photoUrl}
              alt=""
              className={`w-24 h-24 object-cover flex-shrink-0 ring-4 ${photoClass(p.photoShape)}`}
              style={{ boxShadow: `0 0 0 4px ${color}22` }}
            />
          )}
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color }}>
              {cv.ordreNom === "nom-prenom" ? (p.nom || "Nom") : (p.prenom || "Prénom")}
            </h1>
            <h1 className="text-3xl font-extrabold text-slate-800 -mt-1">
              {cv.ordreNom === "nom-prenom" ? (p.prenom || "Prénom") : (p.nom || "Nom")}
            </h1>
            <p className="text-sm text-slate-700 mt-1">{p.titre || (cv.langue === "en" ? "Job Title" : "Titre du poste")}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            p.email,
            p.telephone,
            p.adresse,
            p.permis && `${cv.langue === "en" ? "Driving licence" : "Permis"} ${p.permis}`,
            p.linkedin,
            p.siteWeb,
            ...cv.personalInfo.autresInfos.map((info) =>
              info.label || info.valeur ? `${info.label}${info.label && info.valeur ? " : " : ""}${info.valeur}` : ""
            ),
          ]
            .filter(Boolean)
            .map((v, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: `${color}15`, color }}
              >
                {v}
              </span>
            ))}
        </div>

        <div className="space-y-5">
          {sortedVisible(cv).map((section) => (
            <div key={section.id} className="break-inside-avoid">
              <h2 className="text-[13px] font-extrabold uppercase mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <SectionIcon type={section.type} cv={cv} />{section.titre}
              </h2>
              <div className={["langues", "competences", "interets"].includes(section.type) && section.affichage === "ligne" ? "flex flex-wrap gap-x-3 gap-y-1 items-baseline" : "space-y-2 pl-4"}>
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
          ))}
        </div>
      </div>
    </div>
  );
}
