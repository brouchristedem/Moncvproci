import { FileText, Columns2, Mail, Heading, CalendarCheck, GraduationCap, Tags, TrendingUp } from "lucide-react";
import Reveal from "./Reveal";

// Les familles de critères réellement évaluées par le moteur ATS local
// (voir src/lib/atsEngine.ts) : lecture du fichier, mise en page, coordonnées,
// rubriques, dates, formation, compétences et contenu. Le même moteur sert au
// scanner (PDF) et à l'éditeur.
const CRITERIA = [
  { icon: FileText, titre: "Texte lisible", texte: "Pas une image, pas de caractères illisibles." },
  { icon: Columns2, titre: "Mise en page", texte: "Colonnes, nombre de pages, ordre de lecture." },
  { icon: Mail, titre: "Coordonnées lues", texte: "Nom, email, téléphone, ville en haut du CV." },
  { icon: Heading, titre: "Rubriques reconnues", texte: "Expérience, Formation, Compétences, Langues…" },
  { icon: CalendarCheck, titre: "Postes et dates", texte: "Intitulé, employeur et période pour chaque poste." },
  { icon: GraduationCap, titre: "Formation", texte: "Diplôme, établissement et année." },
  { icon: Tags, titre: "Compétences", texte: "Mots-clés listés, comparables à une offre d'emploi." },
  { icon: TrendingUp, titre: "Contenu", texte: "Verbes d'action, résultats chiffrés, longueur utile." },
];

export default function AtsCriteriaGrid() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {CRITERIA.map((item, i) => (
        <Reveal key={item.titre} delay={i * 50}>
          <div className="h-full flex items-center gap-3 text-left rounded-2xl border border-[#E3F0E9] bg-white px-4 py-3.5 hover:shadow-[0_10px_24px_-16px_rgba(12,59,46,0.2)] transition">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#E3F0E9] text-[#157A52]">
              <item.icon size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#1A2E28]">{item.titre}</h3>
              <p className="text-xs text-[#1A2E28]/60 leading-snug">{item.texte}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
