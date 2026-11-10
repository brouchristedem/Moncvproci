import { CVData, EntryItem, Section, SectionType, SECTION_LABELS_EN, SECTION_LABELS_FR } from "@/lib/types";
import { extractContacts } from "@/lib/personalData";

// Logique commune à l'import d'un CV PDF dans l'éditeur : utilisée à la fois
// par le bloc « Importer un CV existant » de l'éditeur (CvImport) et par le
// passage depuis le scanner de CV (/scanner-cv → éditeur).

// Texte brut du PDF analysé par le scanner, gardé le temps de la navigation
// vers l'éditeur (sessionStorage : propre à l'onglet, jamais envoyé nulle part
// tant que la personne n'a pas donné son accord pour l'import par l'IA).
export const SCANNER_HANDOFF_KEY = "mcvpci_scanner_handoff";

export interface ScannerHandoff {
  text: string;
  fileName: string;
  // Score obtenu au scan : rappelé dans l'éditeur pour montrer la progression.
  percent: number;
  ts: number;
}

export function saveScannerHandoff(h: Omit<ScannerHandoff, "ts">) {
  try {
    window.sessionStorage.setItem(SCANNER_HANDOFF_KEY, JSON.stringify({ ...h, ts: Date.now() }));
  } catch {
    // sessionStorage indisponible : l'éditeur s'ouvrira simplement sans import.
  }
}

export function readScannerHandoff(): ScannerHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(SCANNER_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScannerHandoff;
    // Au-delà de 2 h, on considère que c'est un reste d'une ancienne visite.
    if (!parsed?.text || Date.now() - (parsed.ts || 0) > 2 * 60 * 60 * 1000) {
      window.sessionStorage.removeItem(SCANNER_HANDOFF_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearScannerHandoff() {
  try {
    window.sessionStorage.removeItem(SCANNER_HANDOFF_KEY);
  } catch {}
}

export interface ImportedEntry {
  titre: string;
  sousTitre: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  enCours: boolean;
  description: string;
}

export interface ImportedCV {
  prenom: string;
  nom: string;
  titre: string;
  adresse: string;
  profil: string;
  experience: ImportedEntry[];
  formation: ImportedEntry[];
  competences: { titre: string; niveau: string }[];
  langues: { titre: string; niveau: string }[];
  certifications: ImportedEntry[];
  projets: ImportedEntry[];
  interets: { titre: string }[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function entryItem(e: ImportedEntry): EntryItem {
  return {
    id: uid(),
    titre: e.titre,
    sousTitre: e.sousTitre || undefined,
    lieu: e.lieu || undefined,
    dateDebut: e.dateDebut || undefined,
    dateFin: e.enCours ? "" : e.dateFin || undefined,
    enCours: e.enCours || undefined,
    description: e.description || undefined,
  };
}

// Construit les entrées à remplir pour chaque type de rubrique. Un type absent
// de la liste n'est pas touché : on n'efface jamais une rubrique que l'IA n'a
// rien trouvé à remplir.
function itemsByType(d: ImportedCV): Partial<Record<SectionType, EntryItem[]>> {
  const out: Partial<Record<SectionType, EntryItem[]>> = {};
  if (d.profil) out.profil = [{ id: uid(), titre: "", description: d.profil }];
  const entries: [SectionType, ImportedEntry[]][] = [
    ["experience", d.experience],
    ["formation", d.formation],
    ["certifications", d.certifications],
    ["projets", d.projets],
  ];
  for (const [type, list] of entries) {
    const items = list.filter((e) => e.titre).map(entryItem);
    if (items.length) out[type] = items;
  }
  for (const type of ["competences", "langues"] as const) {
    const items = d[type].filter((e) => e.titre).map((e) => ({ id: uid(), titre: e.titre, niveau: e.niveau || undefined }));
    if (items.length) out[type] = items;
  }
  const interets = d.interets.filter((e) => e.titre).map((e) => ({ id: uid(), titre: e.titre }));
  if (interets.length) out.interets = interets;
  return out;
}

export function hasContent(cv: CVData): boolean {
  return !!cv.personalInfo.prenom || !!cv.personalInfo.nom || cv.sections.some((s) => s.items.length > 0);
}

// Applique le CV importé (renvoyé par l'IA) + les coordonnées retrouvées dans
// le navigateur sur un CV existant, et renvoie le nouveau CV.
export function applyImported(
  c: CVData,
  d: ImportedCV,
  contacts: ReturnType<typeof extractContacts>,
  langue: "fr" | "en"
): CVData {
  const pi = { ...c.personalInfo };
  if (d.prenom) pi.prenom = d.prenom;
  if (d.nom) pi.nom = d.nom;
  if (d.titre) pi.titre = d.titre;
  if (d.adresse) pi.adresse = d.adresse;
  if (contacts.email) pi.email = contacts.email;
  if (contacts.telephone) pi.telephone = contacts.telephone;
  if (contacts.linkedin) pi.linkedin = contacts.linkedin;
  if (contacts.siteWeb) pi.siteWeb = contacts.siteWeb;

  const byType = itemsByType(d);
  const labels = langue === "en" ? SECTION_LABELS_EN : SECTION_LABELS_FR;
  const sections: Section[] = c.sections.map((s) => {
    const items = byType[s.type];
    if (!items) return s;
    delete byType[s.type]; // une seule rubrique par type est remplie
    return { ...s, items };
  });
  // Rubrique manquante dans le CV actuel : on la crée pour ne rien perdre.
  for (const type of Object.keys(byType) as SectionType[]) {
    sections.push({
      id: uid(),
      type,
      titre: labels[type],
      visible: true,
      ordre: sections.length,
      items: byType[type]!,
      affichage: ["competences", "langues", "interets"].includes(type) ? "ligne" : undefined,
    });
  }
  return { ...c, personalInfo: pi, sections };
}
