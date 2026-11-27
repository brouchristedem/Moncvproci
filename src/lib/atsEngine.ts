// Moteur ATS de MON CV PRO CI. Il fait ce que fait un ATS (Workday, Taleo,
// Greenhouse, Lever, iCIMS…) en trois temps :
//   1. LIRE le document : texte extractible ? lignes, colonnes, ordre de lecture ;
//   2. COMPRENDRE : nom, email, téléphone, lieu, rubriques (Expérience,
//      Formation, Compétences…), postes + dates, formations, compétences ;
//   3. NOTER ce qu'il a pu exploiter, puis comparer à l'offre d'emploi.
// Le même barème sert au scanner de PDF (/scanner-cv) et au score de l'éditeur,
// pour que les deux chiffres soient cohérents. Tout est local : rien n'est envoyé.

import { CVData } from "./types";
import { TEMPLATE_LIST } from "./templateRegistry";
import { extractContacts } from "./personalData";
import { foldText, matchKeywords, KeywordResult } from "./keywordMatch";
import type { PdfLayout } from "./pdfLayout";

export type Lang = "fr" | "en";
export type SectionKind =
  | "profil"
  | "experience"
  | "formation"
  | "competences"
  | "langues"
  | "certifications"
  | "projets"
  | "interets"
  | "references";

export type DateFormat = "num" | "text" | "year";

export interface ParsedEntry {
  title: string;
  company: string;
  hasDate: boolean;
  hasTitle: boolean;
  hasCompany: boolean;
}

export interface ParsedEducation {
  hasDegree: boolean;
  hasSchool: boolean;
  hasYear: boolean;
}

export interface ParsedCV {
  source: "pdf" | "editor" | "text";
  textExtractable: boolean;
  pageCount: number;
  wordCount: number;
  garbledRatio: number;
  spacedLetterLines: number;
  columns: 1 | 2;
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  contactOnTop: boolean;
  nameFirst: boolean;
  sectionKinds: SectionKind[]; // rubriques reconnues, dans l'ordre
  unknownHeadings: string[]; // titres de rubriques que l'ATS ne reconnaît pas
  emptySections: number; // rubriques affichées sans contenu (éditeur)
  experiences: ParsedEntry[];
  educations: ParsedEducation[];
  skills: string[];
  dateFormats: DateFormat[];
  bodyText: string; // texte de l'expérience + profil (verbes d'action, chiffres)
  fullText: string;
  letterMarkers: number;
  sectionWordGroups: number;
}

// ---------------------------------------------------------------- dictionnaires

const HEADING_WORDS: Record<SectionKind, string[]> = {
  experience: [
    "experience", "experiences", "experience professionnelle", "experiences professionnelles",
    "parcours professionnel", "experience de travail", "historique professionnel", "work experience",
    "professional experience", "employment history", "work history", "career history", "stages",
    "stage", "stages et experiences", "experiences et stages", "experience professionnelle et stages",
    "experiences professionnelles et stages", "internships", "professional background", "emplois",
  ],
  formation: [
    "formation", "formations", "formation academique", "parcours academique", "parcours scolaire",
    "parcours universitaire", "etudes", "education", "academic background", "education and training",
    "diplomes", "formations et diplomes", "cursus", "scolarite", "formation et diplomes", "qualifications",
  ],
  competences: [
    "competences", "competence", "competences cles", "competences techniques", "competences professionnelles",
    "skills", "technical skills", "key skills", "core competencies", "savoir-faire", "savoir faire",
    "logiciels", "outils", "aptitudes", "expertise", "hard skills", "soft skills", "competences et outils",
    "competences informatiques", "informatique", "technologies",
  ],
  langues: ["langues", "langue", "languages", "language skills", "competences linguistiques"],
  profil: [
    "profil", "profil professionnel", "resume", "resume professionnel", "a propos", "about me", "summary",
    "professional summary", "objectif", "objectif professionnel", "career objective", "presentation",
    "profile", "personal profile", "a propos de moi",
  ],
  certifications: ["certifications", "certification", "certificats", "licences et certifications", "certificates", "formations complementaires"],
  projets: ["projets", "projet", "projet academique", "projets academiques", "projets personnels", "projects", "realisations", "academic projects", "projet professionnel"],
  interets: [
    "centres d'interet", "centres d'interets", "centre d'interet", "interets", "loisirs", "hobbies", "interests",
    "activites", "vie associative", "benevolat", "volunteering", "volunteer experience", "activites extra-professionnelles",
    "centres d interet", "centres d interets",
  ],
  references: ["references", "reference"],
};

const HEADING_MAP: Map<string, SectionKind> = new Map();
for (const kind of Object.keys(HEADING_WORDS) as SectionKind[]) {
  for (const w of HEADING_WORDS[kind]) HEADING_MAP.set(w, kind);
}

export const SECTION_LABEL: Record<Lang, Record<SectionKind, string>> = {
  fr: {
    profil: "Profil", experience: "Expérience", formation: "Formation", competences: "Compétences",
    langues: "Langues", certifications: "Certifications", projets: "Projets", interets: "Centres d'intérêt",
    references: "Références",
  },
  en: {
    profil: "Profile", experience: "Experience", formation: "Education", competences: "Skills",
    langues: "Languages", certifications: "Certifications", projets: "Projects", interets: "Interests",
    references: "References",
  },
};

const ACTION_VERBS = [
  "géré", "gérée", "dirigé", "dirigée", "développé", "développée", "créé", "créée", "piloté", "pilotée",
  "conçu", "conçue", "optimisé", "optimisée", "augmenté", "augmentée", "réduit", "réduite", "amélioré",
  "améliorée", "coordonné", "coordonnée", "supervisé", "supervisée", "mis en place", "lancé", "lancée",
  "négocié", "négociée", "formé", "formée", "analysé", "analysée", "livré", "livrée", "atteint", "atteinte",
  "généré", "générée", "organisé", "organisée", "assuré", "assurée", "réalisé", "réalisée", "animé", "animée",
  "suivi", "contrôlé", "contrôlée", "rédigé", "rédigée", "planifié", "planifiée", "déployé", "déployée",
  "gestion", "pilotage", "coordination", "supervision", "analyse", "suivi", "organisation", "élaboration",
  "managed", "led", "developed", "created", "built", "designed", "optimized", "increased", "reduced",
  "improved", "coordinated", "supervised", "launched", "negotiated", "trained", "analyzed", "delivered",
  "achieved", "generated", "implemented", "organized", "ensured", "planned", "monitored", "wrote",
];

const WORD_CH = "a-zà-ÿ";
function hasWord(lower: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^${WORD_CH}])${esc}(?![${WORD_CH}])`).test(lower);
}

const LETTER_MARKERS = [
  "madame, monsieur", "madame monsieur", "dear sir", "objet :", "objet:", "veuillez agréer", "je vous prie d'agréer",
  "je vous prie d’agréer", "cordialement", "dans l'attente de votre réponse", "dans l’attente de votre réponse",
  "je me permets de", "ma candidature", "sincerely", "yours faithfully",
];

const MONTHS =
  "janv?(?:ier)?|f[ée]vr?(?:ier)?|mars?|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t?|sept?(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?|" +
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const PRESENT = "pr[ée]sent|aujourd['’]?\\s?hui|actuel(?:lement)?|en cours|ce jour|current(?:ly)?|now|today|ongoing";
const DATE_TOKEN = `(?:(?:0?[1-9]|1[0-2])\\s?[\\/.-]\\s?(?:19|20)\\d{2}|(?:${MONTHS})\\.?\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2}(?:-(?:0[1-9]|1[0-2]))?)`;
const RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|à|au|to|jusqu['’]?[àa]|\\/|a)\\s*(${DATE_TOKEN}|${PRESENT})`,
  "i"
);
const SINCE_RE = new RegExp(`(?:depuis|since|from|d[ée]s)\\s+(${DATE_TOKEN})`, "i");
const DATE_ANY_RE = new RegExp(`${DATE_TOKEN}`, "gi");

const LOCATION_RE = new RegExp(
  "\\b(abidjan|cocody|yopougon|marcory|plateau|koumassi|abobo|treichville|adjam[eé]|port-bou[eë]t|riviera|angr[eé]|bingerville|bouak[eé]|yamoussoukro|san-?p[eé]dro|daloa|korhogo|man|gagnoa|abengourou|c[oô]te d['’]ivoire|ivory coast|dakar|s[eé]n[eé]gal|bamako|mali|ouagadougou|burkina|lom[eé]|togo|cotonou|b[eé]nin|accra|ghana|lagos|nigeria|douala|yaound[eé]|cameroun|conakry|guin[eé]e|niamey|niger|libreville|gabon|paris|lyon|marseille|france|bruxelles|belgique|montr[eé]al|qu[eé]bec|canada|london|new york|casablanca|maroc|tunis|alger)\\b|\\bBP\\s?\\d+",
  "i"
);

const DEGREE_RE =
  /(licence|master|\bbts\b|\bdut\b|\bbac\b|baccalaur[eé]at|doctorat|ing[eé]nieur|dipl[oô]me|bachelor|\bmba\b|\bdess\b|\bdea\b|\bcap\b|\bbep\b|\bbepc\b|certificat|degree|\bphd\b|baccalaureate|\bdeug\b|\bl[1-3]\b|\bm[1-2]\b)/i;
const SCHOOL_RE =
  /(universit|[eé]cole|institut|lyc[eé]e|coll[eè]ge|facult[eé]|academy|school|\biua\b|\bensea\b|\binp-?hb\b|\binsaac\b|\besatic\b|\buvci\b|\bhec\b|\besca\b|\buniv\b|\bupb\b|\bufhb\b|centre de formation|groupe scolaire)/i;

// ------------------------------------------------------------------ utilitaires

function stripAccents(s: string): string {
  return foldText(s);
}

export function headingKind(line: string): SectionKind | null {
  const t0 = stripAccents(line)
    .replace(/^[\d.)\s•\-–·▪●]+/, "")
    .replace(/[:：\s]+$/, "")
    .replace(/[^a-z' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t0 || t0.split(" ").length > 6) return null;
  const t = t0.replace(/^(mes|my|ma|mon)\s+/, "");
  return HEADING_MAP.get(t) ?? HEADING_MAP.get(t0) ?? null;
}

function classifyDate(tok: string): DateFormat {
  const t = tok.trim();
  if (/^(?:0?[1-9]|1[0-2])\s?[/.-]\s?(?:19|20)\d{2}$/.test(t)) return "num";
  if (/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/.test(t)) return "num";
  if (/^(?:19|20)\d{2}$/.test(t)) return "year";
  return "text";
}

function wordsOf(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

// ------------------------------------------------------------- lecture du PDF

interface Seg {
  x0: number;
  x1: number;
  text: string;
  size: number;
}
interface Row {
  y: number;
  segs: Seg[];
  size: number;
}

function buildRows(items: PdfLayout["pages"][number]["items"]): Row[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: { y: number; items: typeof items }[] = [];
  for (const it of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(it.y - row.y) <= Math.max(2, it.size * 0.45)) {
      row.items.push(it);
      row.y = (row.y * (row.items.length - 1) + it.y) / row.items.length;
    } else {
      rows.push({ y: it.y, items: [it] });
    }
  }
  return rows.map((r) => {
    const its = [...r.items].sort((a, b) => a.x - b.x);
    const segs: Seg[] = [];
    for (const it of its) {
      const last = segs[segs.length - 1];
      const gap = last ? it.x - last.x1 : Infinity;
      if (last && gap <= Math.max(it.size, last.size) * 1.5) {
        const SPACED = /^(?:\S ){2,}\S$/;
        let space = gap > Math.min(it.size, last.size) * 0.25 && !/\s$/.test(last.text) && !/^\s/.test(it.str) ? " " : "";
        if (SPACED.test(last.text.split("\u0002").pop() || "") && SPACED.test(it.str.trim())) space = "\u0002";
        last.text += space + it.str;
        last.x1 = it.x + it.w;
        last.size = Math.max(last.size, it.size);
      } else {
        segs.push({ x0: it.x, x1: it.x + it.w, text: it.str, size: it.size });
      }
    }
    for (const s of segs) s.text = s.text.replace(/\s+/g, " ").trim();
    return { y: r.y, segs: segs.filter((s) => s.text), size: Math.max(...its.map((i) => i.size)) };
  });
}

const isDateish = (t: string) => new RegExp(`^(?:${DATE_TOKEN}|${PRESENT}|[\\s/.\\-–—àau]|to)+$`, "i").test(t.trim());

// Cherche une « gouttière » verticale : des lignes qui ont du texte des deux
// côtés d'une même abscisse sans qu'aucun texte ne la traverse = deux colonnes.
// Les dates alignées à droite (« Mar 2026 – Juin 2026 ») ne comptent pas : elles
// existent aussi dans un CV à une seule colonne.
function findGutter(rows: Row[], pageW: number): number | null {
  const segs: Seg[] = [];
  for (const r of rows) for (const s of r.segs) if (s.text.length >= 3 && !isDateish(s.text)) segs.push(s);
  if (segs.length < 12) return null;
  let best: { g: number; score: number; right: Seg[]; left: number; cross: number } | null = null;
  for (let g = pageW * 0.15; g <= pageW * 0.85; g += 2) {
    let cross = 0;
    let left = 0;
    const right: Seg[] = [];
    for (const s of segs) {
      if (s.x0 < g - 1 && s.x1 > g + 1) cross++;
      else if (s.x1 <= g - 4) left++;
      else if (s.x0 >= g + 4) right.push(s);
    }
    const score = Math.min(left, right.length) - cross * 3;
    if (!best || score > best.score) best = { g, score, right, left, cross };
  }
  if (!best || best.left < 6 || best.right.length < 6) return null;
  if (best.cross > (best.left + best.right.length) * 0.15) return null;
  // Une vraie colonne commence à la même abscisse à chaque ligne ; du texte
  // aligné à droite (ville, date…) dans un CV à une colonne, non.
  const xs = best.right.map((s) => s.x0);
  const aligned = Math.max(...xs.map((x) => xs.filter((y) => Math.abs(y - x) <= 18).length));
  if (aligned < xs.length * 0.6) return null;
  return best.g;
}

interface ReadLine {
  text: string;
  size: number;
  topRatio: number; // 0 = haut de la 1re page
  page: number;
}

function parseLayout(layout: PdfLayout): ParsedCV {
  const lines: ReadLine[] = [];
  let columns: 1 | 2 = 1;
  let garbled = 0;
  let totalChars = 0;
  let spaced = 0;

  const deferred: (() => void)[] = [];
  layout.pages.forEach((page, pi) => {
    const rows = buildRows(page.items);
    const gutter = findGutter(rows, page.width);
    if (gutter !== null) columns = 2;
    const push = (text: string, size: number, y: number) => {
      let t = text.replace(/\s+/g, " ").trim();
      if (!t) return;
      // « E X P É R I E N C E » : lettres espacées → on recolle pour comprendre, mais on le signale.
      const SP = /^(?:\S ){2,}\S$/;
      let flagged = false;
      t = t
        .split("\u0001")
        .map((part) => {
          const words = part.split("\u0002").map((w) => w.trim());
          if (words.join("").length >= 5 && words.every((w) => SP.test(w))) {
            flagged = true;
            return words.map((w) => w.replace(/ /g, "")).join(" ");
          }
          return part.replace(/\u0002/g, " ");
        })
        .join("  ");
      if (flagged) spaced++;
      totalChars += t.length;
      garbled += (t.match(/[-�\u0000-\u0008]/g) || []).length;
      lines.push({ text: t, size, topRatio: pi === 0 ? y / page.height : 1, page: pi });
    };
    if (gutter === null) {
      for (const r of rows) push(r.segs.map((s) => s.text).join("\u0001"), r.size, r.y);
    } else {
      // Lecture colonne par colonne (ce que fait un bon ATS) : en-tête pleine largeur,
      // puis colonne de gauche, puis colonne de droite.
      // L'en-tête (nom, titre, coordonnées) s'arrête où commence la colonne de droite :
      // première ligne dont un morceau est aligné sur l'abscisse habituelle de cette colonne.
      const rightX = rows.flatMap((r) => r.segs.filter((sg) => sg.x0 >= gutter + 4 && sg.text.length >= 3 && !isDateish(sg.text)).map((sg) => sg.x0)).sort((u, v) => u - v);
      const medX = rightX.length ? rightX[Math.floor(rightX.length / 2)] : gutter;
      const firstBoth = rows.findIndex((r) => r.segs.some((sg) => sg.x0 >= gutter + 4 && sg.text.length >= 3 && !isDateish(sg.text) && Math.abs(sg.x0 - medX) <= 24));
      const headRows = firstBoth > 0 ? rows.slice(0, firstBoth) : [];
      const bodyRows = firstBoth > 0 ? rows.slice(firstBoth) : rows;
      for (const r of headRows) push(r.segs.map((s) => s.text).join("\u0001"), r.size, r.y);
      const left: { t: string; size: number; y: number }[] = [];
      const right: { t: string; size: number; y: number }[] = [];
      for (const r of bodyRows) {
        const ls = r.segs.filter((s) => s.x0 < gutter);
        const rs = r.segs.filter((s) => s.x0 >= gutter);
        if (ls.length) left.push({ t: ls.map((s) => s.text).join("\u0001"), size: Math.max(...ls.map((s) => s.size)), y: r.y });
        if (rs.length) right.push({ t: rs.map((s) => s.text).join("\u0001"), size: Math.max(...rs.map((s) => s.size)), y: r.y });
      }
      // La colonne qui contient le plus de texte est lue en premier si le nom/titre est à droite.
      // La colonne de droite de chaque page est lue après la colonne de gauche de TOUTES
      // les pages (sinon la suite d'une expérience tombe après « Compétences » de la page 1).
      for (const c of left) push(c.t, c.size, c.y);
      for (const c of right) deferred.push(() => push(c.t, c.size, c.y));
    }
  });
  for (const f of deferred) f();

  return finishParse(lines, {
    source: "pdf",
    pageCount: layout.pages.length,
    columns,
    garbled,
    totalChars,
    spaced,
  });
}

// Texte brut sans positions (une colonne). Sert aux tests et au repli.
export function parseText(text: string, pageCount = 1): ParsedCV {
  const lines: ReadLine[] = [];
  const raw = text.split(/\r?\n/);
  raw.forEach((l, i) => {
    const t = l.replace(/\s+/g, " ").trim();
    if (t) lines.push({ text: t, size: 10, topRatio: i / Math.max(raw.length, 1), page: 0 });
  });
  const totalChars = lines.reduce((s, l) => s + l.text.length, 0);
  return finishParse(lines, { source: "text", pageCount, columns: 1, garbled: 0, totalChars, spaced: 0 });
}

function median(nums: number[]): number {
  if (!nums.length) return 10;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function finishParse(
  lines: ReadLine[],
  meta: { source: ParsedCV["source"]; pageCount: number; columns: 1 | 2; garbled: number; totalChars: number; spaced: number }
): ParsedCV {
  const fullText = lines.map((l) => l.text).join("\n");
  const wordCount = wordsOf(fullText).length;
  const bodySize = median(lines.map((l) => l.size));

  // --- découpage en rubriques
  type Sec = { kind: SectionKind; heading: string; lines: ReadLine[]; unknown?: boolean };
  const header: ReadLine[] = [];
  const sections: Sec[] = [];
  const unknownHeadings: string[] = [];
  let cur: Sec | null = null;
  for (const l of lines) {
    const k = headingKind(l.text);
    if (k && l.text.length <= 45) {
      cur = { kind: k, heading: l.text, lines: [] };
      sections.push(cur);
      continue;
    }
    if (cur) {
      const w = wordsOf(l.text);
      const letters = l.text.replace(/[^A-Za-zÀ-ÿ]/g, "");
      const upper = letters.length >= 4 && letters === letters.toUpperCase();
      if (upper && w.length <= 4 && !/\d|@/.test(l.text) && l.size >= bodySize * 0.95 && !LOCATION_RE.test(l.text) && !DEGREE_RE.test(l.text)) {
        // Titre en capitales qui n'est dans aucune liste connue : l'ATS ne saura pas où le ranger.
        if (/^[A-ZÀ-Ý' -]+$/.test(l.text)) {
          unknownHeadings.push(l.text);
          // le contenu qui suit n'est plus rattaché à la rubrique précédente
          cur = { kind: "references", heading: l.text, lines: [], unknown: true };
          sections.push(cur);
          continue;
        }
      }
      cur.lines.push(l);
    } else {
      header.push(l);
    }
  }
  const known = sections.filter((s) => !s.unknown);
  const sectionKinds: SectionKind[] = [];
  for (const s of known) if (!sectionKinds.includes(s.kind)) sectionKinds.push(s.kind);

  // --- coordonnées
  const contacts = extractContacts(fullText);
  const topLines = lines.filter((l) => l.page === 0 && l.topRatio <= 0.3);
  const email = contacts.email;
  const phone = contacts.telephone;
  const linkedin = contacts.linkedin;
  // Chaque ligne est découpée en morceaux (colonnes / cases d'une même rangée).
  type Piece = { text: string; size: number; line: ReadLine };
  const explode = (ls: ReadLine[]): Piece[] =>
    ls.flatMap((l) =>
      l.text
        .split(/\s{2,}|\|/)
        .map((t) => ({ text: t.trim(), size: l.size, line: l }))
        .filter((pc) => pc.text)
    );
  const headLines = header.length ? header : topLines;
  const headPieces = explode(headLines);
  const contactIdx = lines.findIndex((l) => (email && l.text.includes(email)) || (phone && l.text.replace(/\s/g, "").includes(phone.replace(/\s/g, ""))));
  const nearContact = contactIdx >= 0 ? [...explode(lines.slice(contactIdx, contactIdx + 4)), ...explode(lines.slice(Math.max(0, contactIdx - 2), contactIdx))] : [];
  const isLoc = (t: string) => LOCATION_RE.test(t) && !/@|linkedin|https?:|www\./i.test(t) && t.length <= 70 && !RANGE_RE.test(t);
  const location =
    nearContact.find((pc) => isLoc(pc.text))?.text ||
    headPieces.find((pc) => isLoc(pc.text))?.text ||
    explode(topLines).find((pc) => isLoc(pc.text))?.text ||
    "";

  // nom : plus grande police de l'en-tête, 1 à 5 mots, sans chiffres
  const nameCands = headPieces.filter((pc) => {
    const w = wordsOf(pc.text);
    return w.length >= 1 && w.length <= 6 && !/\d|@|:|\.com|\.ci|\.org|www\.|\//i.test(pc.text) && !LOCATION_RE.test(pc.text) && pc.text.length <= 60 && !/^[A-ZÀ-Ý]{1,3}$/.test(pc.text);
  });
  const maxSize = Math.max(0, ...nameCands.map((pc) => pc.size));
  const namePiece = nameCands.find((pc) => pc.size >= maxSize - 0.4) || nameCands[0];
  let name = namePiece ? namePiece.text : "";
  // Prénom et nom sur deux lignes de même taille (« Christ Edem » / « BROU »).
  if (namePiece) {
    const at = headPieces.indexOf(namePiece);
    const nxt = headPieces[at + 1];
    if (nxt && Math.abs(nxt.size - namePiece.size) <= 0.4 && nxt.line !== namePiece.line && wordsOf(nxt.text).length <= 2 && wordsOf(name).length <= 2 && !/\d|@|:|\//.test(nxt.text) && !LOCATION_RE.test(nxt.text)) {
      name = `${name} ${nxt.text}`;
    }
  }
  const nameFirst = !!namePiece && lines.findIndex((l) => l === namePiece.line) <= 1;
  const headlinePiece = namePiece
    ? headPieces.find((pc, i) => i > headPieces.indexOf(namePiece) && pc.line !== namePiece.line && !/@|\d{6}/.test(pc.text) && !LOCATION_RE.test(pc.text) && wordsOf(pc.text).length >= 2 && pc.text.length <= 90 && pc.text !== name.split(" ").slice(-1)[0])
    : undefined;
  const headline = headlinePiece ? headlinePiece.text : "";

  const firstContact = lines.find((l) => (email && l.text.includes(email)) || (phone && l.text.replace(/\s/g, "").includes(phone.replace(/\s/g, ""))));
  const contactOnTop = !!firstContact && firstContact.page === 0 && firstContact.topRatio <= 0.28;

  // --- expérience
  const expLines = known.filter((s) => s.kind === "experience").flatMap((s) => s.lines);
  const experiences: ParsedEntry[] = [];
  const dateFormats: DateFormat[] = [];
  const collectFormats = (text: string) => {
    for (const m of text.match(DATE_ANY_RE) || []) dateFormats.push(classifyDate(m));
  };
  {
    const idx: number[] = [];
    // Une plage de dates coupée en fin de ligne (« 01/2020 — » / « Aujourd'hui ») est recollée.
    expLines.forEach((l, i) => {
      const nx = expLines[i + 1];
      if (nx && /[-–—]\s*$/.test(l.text) && !RANGE_RE.test(l.text) && RANGE_RE.test(`${l.text} ${nx.text}`)) {
        expLines.splice(i, 2, { ...l, text: `${l.text} ${nx.text}` });
      }
    });
    expLines.forEach((l, i) => {
      if (RANGE_RE.test(l.text) || SINCE_RE.test(l.text)) idx.push(i);
    });
    idx.forEach((i) => {
      const line = expLines[i].text;
      const withoutDates = line
        .replace(RANGE_RE, " ")
        .replace(SINCE_RE, " ")
        .replace(/\s{2,}/g, "  ")
        .trim()
        .replace(/^[|·•\-–—,\s]+|[|·•\-–—,\s]+$/g, "");
      const prev = expLines[i - 1]?.text ?? "";
      const next = expLines[i + 1]?.text ?? "";
      const nextIsRange = idx.includes(i + 1);
      let title = withoutDates;
      let company = "";
      if (title.length >= 3) {
        const parts = title.split(/\s{2,}|\s[|·@–—-]\s| chez | at /i).map((p) => p.trim()).filter(Boolean);
        if (parts.length > 1) {
          title = parts[0];
          company = parts.slice(1).join(" ");
        } else if (next && !nextIsRange && next.length <= 80 && !/[.!?]$/.test(next) && headingKind(next) === null) {
          company = next;
        }
      } else {
        // date seule sur sa ligne : titre avant ou après
        const cands = [prev, next].filter((t) => t && t.length <= 90 && headingKind(t) === null);
        title = cands[0] || "";
        company = cands[1] || "";
      }
      experiences.push({
        title,
        company,
        hasDate: true,
        hasTitle: title.length >= 3,
        hasCompany: company.length >= 2,
      });
      collectFormats(line);
    });
  }

  // --- formation
  const eduLines = known.filter((s) => s.kind === "formation").flatMap((s) => s.lines);
  const educations: ParsedEducation[] = [];
  eduLines.forEach((l, i) => {
    if (!DEGREE_RE.test(l.text)) return;
    const block = [eduLines[i - 1]?.text, l.text, eduLines[i + 1]?.text, eduLines[i + 2]?.text].filter(Boolean).join(" ");
    educations.push({
      hasDegree: true,
      hasSchool: SCHOOL_RE.test(block),
      hasYear: /\b(?:19|20)\d{2}\b/.test(block),
    });
  });
  if (educations.length === 0 && eduLines.length > 0) {
    // intitulés sans mot-clé de diplôme : on compte des entrées « partielles »
    const withYear = eduLines.filter((l) => /\b(?:19|20)\d{2}\b/.test(l.text));
    withYear.forEach((l) => {
      const hasSchool = SCHOOL_RE.test(l.text) || eduLines.some((x) => SCHOOL_RE.test(x.text));
      educations.push({ hasDegree: false, hasSchool, hasYear: true });
    });
  }

  // --- compétences
  const skillLines = known.filter((s) => s.kind === "competences").flatMap((s) => s.lines);
  const skills = skillLines
    .flatMap((l) => l.text.split(/\s{2,}|[,;•·|●▪◦]/))
    .map((s) => s.trim().replace(/^[-–—:]+|[-–—:]+$/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 60);

  const bodyText = known
    .filter((s) => s.kind === "experience" || s.kind === "profil" || s.kind === "projets")
    .flatMap((s) => s.lines)
    .map((l) => l.text)
    .join("\n");

  const lowerFull = foldText(fullText);
  const letterMarkers = LETTER_MARKERS.filter((m) => lowerFull.includes(foldText(m))).length;
  const sectionWordGroups = (Object.keys(HEADING_WORDS) as SectionKind[]).filter((k) =>
    HEADING_WORDS[k].some((w) => hasWord(lowerFull, w))
  ).length;

  return {
    source: meta.source,
    textExtractable: meta.totalChars >= 40,
    pageCount: meta.pageCount,
    wordCount,
    garbledRatio: meta.totalChars ? meta.garbled / meta.totalChars : 0,
    spacedLetterLines: meta.spaced,
    columns: meta.columns,
    name,
    headline,
    email,
    phone,
    location,
    linkedin,
    contactOnTop,
    nameFirst,
    sectionKinds,
    unknownHeadings,
    emptySections: 0,
    experiences,
    educations,
    skills,
    dateFormats,
    bodyText,
    fullText,
    letterMarkers,
    sectionWordGroups,
  };
}

export function parsePdfLayout(layout: PdfLayout): ParsedCV {
  return parseLayout(layout);
}

// ------------------------------------------------------- lecture depuis l'éditeur

function classifyEditorDate(v: string, fmt: CVData["dateFormat"]): DateFormat {
  if (/^\d{4}$/.test(v.trim())) return "year";
  return fmt === "numerique" ? "num" : "text";
}

export function parseCvData(cv: CVData): ParsedCV {
  const p = cv.personalInfo;
  const meta = TEMPLATE_LIST.find((t) => t.id === cv.templateId);
  const visible = cv.sections.filter((s) => s.visible);
  const sectionKinds: SectionKind[] = [];
  const unknownHeadings: string[] = [];
  let emptySections = 0;
  for (const s of visible) {
    if (s.items.length === 0) {
      emptySections++;
      continue;
    }
    const k = headingKind(s.titre);
    if (k) {
      if (!sectionKinds.includes(k)) sectionKinds.push(k);
    } else {
      unknownHeadings.push(s.titre);
    }
  }
  const items = (type: string) => visible.filter((s) => s.type === type).flatMap((s) => s.items);
  const dateFormats: DateFormat[] = [];
  const addDates = (it: { dateDebut?: string; dateFin?: string }) => {
    if (it.dateDebut?.trim()) dateFormats.push(classifyEditorDate(it.dateDebut, cv.dateFormat));
    if (it.dateFin?.trim()) dateFormats.push(classifyEditorDate(it.dateFin, cv.dateFormat));
  };
  const experiences: ParsedEntry[] = items("experience").map((it) => {
    addDates(it);
    return {
      title: it.titre,
      company: it.sousTitre || "",
      hasDate: !!it.dateDebut?.trim(),
      hasTitle: it.titre.trim().length >= 3,
      hasCompany: (it.sousTitre || "").trim().length >= 2,
    };
  });
  const educations: ParsedEducation[] = items("formation").map((it) => {
    addDates(it);
    const block = `${it.titre} ${it.sousTitre || ""}`;
    return {
      hasDegree: it.titre.trim().length >= 3,
      hasSchool: (it.sousTitre || "").trim().length >= 2 || SCHOOL_RE.test(block),
      hasYear: !!(it.dateDebut?.trim() || it.dateFin?.trim()) || /\b(?:19|20)\d{2}\b/.test(block),
    };
  });
  const skills = items("competences").map((it) => it.titre.trim()).filter(Boolean);

  const allText: string[] = [
    `${p.prenom} ${p.nom}`,
    p.titre,
    p.email,
    p.telephone,
    p.adresse,
    p.linkedin || "",
    p.siteWeb || "",
  ];
  for (const s of visible) {
    allText.push(s.titre);
    for (const it of s.items) {
      allText.push(it.titre, it.sousTitre || "", it.lieu || "", it.niveau || "", it.description || "");
    }
  }
  const fullText = allText.filter((t) => t && t.trim()).join("\n");
  const bodyText = visible
    .filter((s) => s.type === "experience" || s.type === "profil" || s.type === "projets")
    .flatMap((s) => s.items.map((it) => `${it.titre} ${it.description || ""}`))
    .join("\n");

  return {
    source: "editor",
    textExtractable: true,
    pageCount: 1,
    wordCount: wordsOf(fullText).length,
    garbledRatio: 0,
    spacedLetterLines: 0,
    columns: meta?.colonnes ?? 1,
    name: `${p.prenom} ${p.nom}`.trim(),
    headline: p.titre,
    email: p.email.trim(),
    phone: p.telephone.trim(),
    location: p.adresse.trim(),
    linkedin: (p.linkedin || "").trim(),
    contactOnTop: true,
    nameFirst: true,
    sectionKinds,
    unknownHeadings,
    emptySections,
    experiences,
    educations,
    skills,
    dateFormats,
    bodyText,
    fullText,
    letterMarkers: 0,
    sectionWordGroups: sectionKinds.length,
  };
}

// ------------------------------------------------------------------- notation

export type GroupId = "technique" | "structure" | "donnees" | "contenu";
export type DocType = "cv" | "lettre" | "autre";

export interface CriterionResult {
  id: string;
  group: GroupId;
  label: string;
  tip: string;
  weight: number;
  score: number; // 0..1
  status: "ok" | "partial" | "fail";
  detail: string;
}

export interface ATSReport {
  isCv: boolean;
  docType: DocType;
  percent: number; // score final (avec offre si fournie)
  baseScore: number; // lisibilité + structure + contenu, sans l'offre
  matchPercent: number | null; // correspondance avec l'offre (null si pas d'offre)
  tier: "excellent" | "bon" | "faible";
  criteria: CriterionResult[];
  groups: { id: GroupId; label: string; percent: number }[];
  nextTip: string | null;
  capReason: string | null;
  keywords: KeywordResult | null;
  parsed: ParsedCV;
  wordCount: number;
}

interface CriterionDef {
  id: string;
  group: GroupId;
  weight: number;
  label: Record<Lang, string>;
  tip: Record<Lang, string>;
  eval: (p: ParsedCV, lang: Lang) => { score: number; detail: Record<Lang, string> };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const D = (fr: string, en: string): Record<Lang, string> => ({ fr, en });

const countNumbers = (text: string): number => {
  const cleaned = text.replace(DATE_ANY_RE, " ").replace(/\b(?:19|20)\d{2}\b/g, " ");
  return (cleaned.match(/\d[\d\s.,]*\s?(?:%|fcfa|f cfa|xof|€|\$|k\b|m\b|personnes?|clients?|people|users|projets?|projects)?/gi) || []).filter((m) => /\d/.test(m)).length;
};

const CRITERIA: CriterionDef[] = [
  // ------------------------------------------------ lecture technique (28)
  {
    id: "text",
    group: "technique",
    weight: 10,
    label: D("Texte lisible par un logiciel", "Machine-readable text"),
    tip: D(
      "Le texte n'a pas pu être lu : le fichier est sûrement une image ou un scan. Exportez votre CV en PDF « texte » (depuis l'éditeur ou Word), pas en photo.",
      "No text could be read: the file is probably an image or a scan. Export your CV as a real text PDF, not a photo."
    ),
    eval: (p) => ({
      score: p.textExtractable && p.wordCount >= 40 ? 1 : 0,
      detail: D(p.textExtractable ? `${p.wordCount} mots lus` : "aucun texte lu", p.textExtractable ? `${p.wordCount} words read` : "no text read"),
    }),
  },
  {
    id: "clean",
    group: "technique",
    weight: 5,
    label: D("Caractères propres", "Clean characters"),
    tip: D(
      "Des caractères illisibles ou des lettres espacées ont été trouvés (icônes en police spéciale, titres écartés). Un ATS lit alors des mots coupés.",
      "Unreadable characters or spaced-out letters were found (icon fonts, stretched headings). An ATS reads broken words."
    ),
    eval: (p) => {
      let s = 1;
      if (p.garbledRatio > 0.02) s = 0;
      else if (p.garbledRatio > 0.005) s = 0.5;
      if (p.spacedLetterLines > 0) s = Math.min(s, 0.5);
      if (p.emptySections > 0) s = Math.min(s, 0.6);
      const d = p.emptySections > 0
        ? D(`${p.emptySections} rubrique(s) vide(s) affichée(s)`, `${p.emptySections} empty section(s) shown`)
        : D("rien d'anormal", "nothing unusual");
      return { score: s, detail: d };
    },
  },
  {
    id: "columns",
    group: "technique",
    weight: 8,
    label: D("Mise en page en une colonne", "Single-column layout"),
    tip: D(
      "Votre CV est sur deux colonnes : certains ATS lisent les lignes de gauche à droite et mélangent les deux colonnes. Un modèle une colonne est le plus sûr.",
      "Your CV uses two columns: some ATS read line by line across both columns and mix them up. A single-column template is safest."
    ),
    eval: (p) => ({
      score: p.columns === 1 ? 1 : 0.45,
      detail: D(p.columns === 1 ? "1 colonne" : "2 colonnes détectées", p.columns === 1 ? "1 column" : "2 columns detected"),
    }),
  },
  {
    id: "pages",
    group: "technique",
    weight: 5,
    label: D("Longueur : 1 à 2 pages", "Length: 1 to 2 pages"),
    tip: D(
      "Un CV de plus de 2 pages est souvent tronqué ou mal classé. Gardez l'essentiel : 1 page (2 si plus de 10 ans d'expérience).",
      "A CV over 2 pages is often truncated or ranked lower. Keep it to 1 page (2 with over 10 years of experience)."
    ),
    eval: (p) => ({
      score: p.pageCount <= 1 ? 1 : p.pageCount === 2 ? 0.9 : p.pageCount === 3 ? 0.5 : 0.2,
      detail: D(`${p.pageCount} page(s)`, `${p.pageCount} page(s)`),
    }),
  },
  // ----------------------------------------------------- structure (30)
  {
    id: "contact",
    group: "structure",
    weight: 12,
    label: D("Nom, email et téléphone détectés", "Name, email and phone detected"),
    tip: D(
      "Il manque une coordonnée essentielle (nom, email ou téléphone). Sans email lisible, l'ATS ne peut même pas créer votre fiche candidat.",
      "An essential contact detail is missing (name, email or phone). Without a readable email an ATS cannot even create your candidate record."
    ),
    eval: (p) => {
      const s = (p.name ? 0.25 : 0) + (p.email ? 0.4 : 0) + (p.phone ? 0.35 : 0);
      const fr = [p.name && "nom", p.email && "email", p.phone && "tél."].filter(Boolean).join(", ");
      const en = [p.name && "name", p.email && "email", p.phone && "phone"].filter(Boolean).join(", ");
      return { score: s, detail: D(fr || "aucune", en || "none") };
    },
  },
  {
    id: "location",
    group: "structure",
    weight: 3,
    label: D("Ville ou pays indiqué", "City or country shown"),
    tip: D(
      "Ajoutez votre ville (ex. Abidjan, Côte d'Ivoire) : beaucoup de recruteurs filtrent les candidatures par localisation.",
      "Add your city (e.g. Abidjan, Ivory Coast): many recruiters filter applications by location."
    ),
    eval: (p) => ({ score: p.location ? 1 : 0, detail: D(p.location || "non trouvée", p.location || "not found") }),
  },
  {
    id: "headings",
    group: "structure",
    weight: 10,
    label: D("Rubriques standard reconnues", "Standard headings recognised"),
    tip: D(
      "Les ATS cherchent des titres classiques : « Expérience professionnelle », « Formation », « Compétences ». Les titres originaux (ex. « Mon parcours ») ne sont pas compris.",
      "ATS look for classic headings: “Experience”, “Education”, “Skills”. Creative headings (e.g. “My journey”) are not understood."
    ),
    eval: (p) => {
      const need: SectionKind[] = ["experience", "formation", "competences"];
      const got = need.filter((k) => p.sectionKinds.includes(k)).length;
      const penalty = Math.min(0.4, p.unknownHeadings.length * 0.15);
      const s = clamp01(got / 3 - penalty);
      const unk = p.unknownHeadings.length ? ` · non reconnu : ${p.unknownHeadings.slice(0, 2).join(", ")}` : "";
      const unkEn = p.unknownHeadings.length ? ` · not recognised: ${p.unknownHeadings.slice(0, 2).join(", ")}` : "";
      return { score: s, detail: D(`${got}/3 rubriques clés${unk}`, `${got}/3 key sections${unkEn}`) };
    },
  },
  {
    id: "top",
    group: "structure",
    weight: 5,
    label: D("Coordonnées en haut de la page", "Contact details at the top"),
    tip: D(
      "Placez votre nom et vos coordonnées tout en haut de la première page (pas en bas, ni dans un pied de page) : les ATS ignorent souvent les en-têtes et pieds de page.",
      "Put your name and contact details at the very top of page one (not in a footer): ATS often ignore headers and footers."
    ),
    eval: (p) => {
      const s = p.email || p.phone ? (p.contactOnTop ? (p.nameFirst ? 1 : 0.7) : 0.3) : 0;
      return { score: s, detail: D(p.contactOnTop ? "en haut de la page 1" : "pas en haut de la page", p.contactOnTop ? "top of page 1" : "not at the top") };
    },
  },
  // ------------------------------------------------ données exploitables (22)
  {
    id: "dates",
    group: "donnees",
    weight: 8,
    label: D("Dates de chaque expérience lues", "Dates read for every job"),
    tip: D(
      "Chaque expérience doit avoir une période claire (ex. « Mars 2024 – Juin 2025 »). Sans dates, l'ATS ne calcule pas votre ancienneté ni votre chronologie.",
      "Every job needs a clear period (e.g. “Mar 2024 – Jun 2025”). Without dates the ATS cannot compute your seniority or timeline."
    ),
    eval: (p) => {
      if (p.experiences.length === 0) {
        const edu = p.educations.some((e) => e.hasYear);
        return { score: edu ? 0.4 : 0, detail: D("aucune expérience datée", "no dated job found") };
      }
      const ok = p.experiences.filter((e) => e.hasDate).length;
      return { score: ok / p.experiences.length, detail: D(`${ok}/${p.experiences.length} expérience(s) datée(s)`, `${ok}/${p.experiences.length} job(s) dated`) };
    },
  },
  {
    id: "dateformat",
    group: "donnees",
    weight: 4,
    label: D("Format de date cohérent", "Consistent date format"),
    tip: D(
      "Mélanger « 2024 », « 03/2024 » et « mars 2024 » trouble l'ATS. Gardez un seul format partout (ex. « mars 2024 »).",
      "Mixing “2024”, “03/2024” and “March 2024” confuses an ATS. Use a single format everywhere."
    ),
    eval: (p) => {
      if (p.dateFormats.length === 0) return { score: 0, detail: D("aucune date", "no dates") };
      const counts: Record<string, number> = {};
      for (const f of p.dateFormats) counts[f] = (counts[f] || 0) + 1;
      const top = Math.max(...Object.values(counts)) / p.dateFormats.length;
      return { score: top >= 0.85 ? 1 : top >= 0.6 ? 0.5 : 0, detail: D(`${Math.round(top * 100)} % dans le même format`, `${Math.round(top * 100)}% in the same format`) };
    },
  },
  {
    id: "entries",
    group: "donnees",
    weight: 5,
    label: D("Poste et employeur identifiés", "Job title and employer identified"),
    tip: D(
      "Pour chaque expérience, écrivez clairement l'intitulé du poste et le nom de l'entreprise, sur des lignes distinctes : c'est ce que l'ATS range dans votre fiche.",
      "For each job, write the job title and company name clearly on separate lines: that is what the ATS stores in your profile."
    ),
    eval: (p) => {
      if (p.experiences.length === 0) return { score: 0, detail: D("aucune expérience", "no jobs found") };
      const s = p.experiences.reduce((a, e) => a + (e.hasTitle ? 0.5 : 0) + (e.hasCompany ? 0.5 : 0), 0) / p.experiences.length;
      return { score: s, detail: D(`${p.experiences.length} expérience(s) analysée(s)`, `${p.experiences.length} job(s) analysed`) };
    },
  },
  {
    id: "education",
    group: "donnees",
    weight: 5,
    label: D("Diplôme, école et année lus", "Degree, school and year read"),
    tip: D(
      "Pour chaque formation : intitulé du diplôme, établissement et année. Les ATS filtrent souvent sur le niveau d'études.",
      "For each education entry: degree title, school and year. ATS often filter on education level."
    ),
    eval: (p) => {
      if (p.educations.length === 0) return { score: 0, detail: D("aucune formation lue", "no education read") };
      const s = p.educations.reduce((a, e) => a + (e.hasDegree ? 0.4 : 0) + (e.hasSchool ? 0.35 : 0) + (e.hasYear ? 0.25 : 0), 0) / p.educations.length;
      return { score: s, detail: D(`${p.educations.length} formation(s)`, `${p.educations.length} education entr${p.educations.length > 1 ? "ies" : "y"}`) };
    },
  },
  // ----------------------------------------------------------- contenu (20)
  {
    id: "skills",
    group: "contenu",
    weight: 6,
    label: D("Liste de compétences (mots-clés)", "Skills list (keywords)"),
    tip: D(
      "Listez au moins 6 compétences concrètes (outils, logiciels, savoir-faire) : l'ATS filtre les candidats par mots-clés.",
      "List at least 6 concrete skills (tools, software, know-how): ATS filter candidates by keywords."
    ),
    eval: (p) => {
      const n = p.skills.length;
      return { score: n >= 8 ? 1 : n >= 5 ? 0.8 : n >= 3 ? 0.5 : n >= 1 ? 0.25 : 0, detail: D(`${n} compétence(s)`, `${n} skill(s)`) };
    },
  },
  {
    id: "verbs",
    group: "contenu",
    weight: 4,
    label: D("Verbes d'action", "Action verbs"),
    tip: D(
      "Décrivez vos missions avec des verbes d'action (géré, piloté, organisé, développé…) plutôt que des phrases passives.",
      "Describe your tasks with action verbs (managed, led, organised, built…) rather than passive phrases."
    ),
    eval: (p) => {
      const lower = foldText(p.bodyText);
      const n = new Set(ACTION_VERBS.filter((v) => hasWord(lower, foldText(v)))).size;
      return { score: n >= 3 ? 1 : n >= 1 ? 0.6 : 0, detail: D(`${n} verbe(s) trouvé(s)`, `${n} verb(s) found`) };
    },
  },
  {
    id: "numbers",
    group: "contenu",
    weight: 4,
    label: D("Résultats chiffrés", "Quantified results"),
    tip: D(
      "Ajoutez des chiffres à vos expériences (ex. « équipe de 8 personnes », « −15 % de pénalités », « 120 dossiers »).",
      "Add numbers to your experience (e.g. “team of 8”, “−15% penalties”, “120 files”)."
    ),
    eval: (p) => {
      const n = countNumbers(p.bodyText);
      return { score: n >= 2 ? 1 : n === 1 ? 0.6 : 0, detail: D(`${n} chiffre(s) trouvé(s)`, `${n} figure(s) found`) };
    },
  },
  {
    id: "length",
    group: "contenu",
    weight: 6,
    label: D("Quantité de contenu adaptée", "Right amount of content"),
    tip: D(
      "Un CV de moins de 200 mots ne donne pas assez de matière à l'ATS ; au-delà de 900 mots il devient trop dense. Visez 300 à 700 mots.",
      "A CV under 200 words gives the ATS too little to work with; over 900 words it gets too dense. Aim for 300 to 700 words."
    ),
    eval: (p) => {
      const w = p.wordCount;
      const s = w >= 250 && w <= 900 ? 1 : w >= 150 && w < 250 ? 0.6 : w > 900 && w <= 1200 ? 0.6 : 0.2;
      return { score: s, detail: D(`${w} mots`, `${w} words`) };
    },
  },
];

const GROUP_LABEL: Record<Lang, Record<GroupId, string>> = {
  fr: { technique: "Lecture du fichier", structure: "Structure", donnees: "Données exploitées", contenu: "Contenu" },
  en: { technique: "File reading", structure: "Structure", donnees: "Data extracted", contenu: "Content" },
};

export function detectDocType(p: ParsedCV): { isCv: boolean; docType: DocType } {
  const hasDates = p.experiences.length > 0 || p.dateFormats.length >= 2;
  const hasContact = !!(p.email || p.phone);
  const looksLikeLetter = p.letterMarkers >= 2 && p.sectionKinds.length < 3;
  if (p.source === "editor") return { isCv: true, docType: "cv" };
  const structured = p.sectionKinds.length >= 2 || p.sectionWordGroups >= 3;
  // CV aux rubriques « maison » (« Mon parcours »…) : pas de titre connu, mais des
  // coordonnées + des périodes datées + un diplôme restent des marqueurs de CV.
  const rangeCount = (p.fullText.match(new RegExp(RANGE_RE.source, "gi")) || []).length;
  const looksLikeCvBody = hasContact && rangeCount >= 1 && DEGREE_RE.test(p.fullText);
  const isCv = !looksLikeLetter && (structured || looksLikeCvBody) && (hasContact || hasDates) && p.wordCount <= 2600 && p.wordCount >= 40;
  return { isCv, docType: isCv ? "cv" : looksLikeLetter ? "lettre" : "autre" };
}

export function scoreParsed(p: ParsedCV, opts: { lang?: Lang; jobText?: string } = {}): ATSReport {
  const lang: Lang = opts.lang ?? "fr";
  const { isCv, docType } = detectDocType(p);

  const results: CriterionResult[] = CRITERIA.map((c) => {
    const { score, detail } = c.eval(p, lang);
    const s = clamp01(score);
    return {
      id: c.id,
      group: c.group,
      label: c.label[lang],
      tip: c.tip[lang],
      weight: c.weight,
      score: s,
      status: s >= 0.95 ? "ok" : s > 0 ? "partial" : "fail",
      detail: detail[lang],
    };
  });

  const total = results.reduce((a, r) => a + r.weight, 0);
  const got = results.reduce((a, r) => a + r.weight * r.score, 0);
  let base = Math.round((got / total) * 100);

  // Éliminatoires : un ATS rejette ou classe très bas dans ces cas, quel que soit le reste.
  let capReason: string | null = null;
  const cap = (max: number, fr: string, en: string) => {
    if (base > max) {
      base = max;
      capReason = lang === "fr" ? fr : en;
    }
  };
  if (!p.textExtractable) cap(0, "Aucun texte lisible : un ATS ne peut rien analyser (fichier image ou scan).", "No readable text: an ATS cannot analyse anything (image or scan).");
  else {
    if (!p.email) cap(70, "Sans email lisible, un ATS ne peut pas créer votre fiche candidat : le score est plafonné à 70.", "Without a readable email an ATS cannot create your candidate record: score capped at 70.");
    if (!p.sectionKinds.includes("experience") && !p.sectionKinds.includes("formation")) cap(55, "Ni expérience ni formation reconnues : le score est plafonné à 55.", "No experience or education recognised: score capped at 55.");
  }

  let keywords: KeywordResult | null = null;
  let matchPercent: number | null = null;
  const jobText = (opts.jobText || "").trim();
  if (jobText.length >= 40) {
    const kw = matchKeywords(p.fullText, jobText);
    if (kw.keywords.length >= 4) {
      keywords = kw;
      matchPercent = kw.matchPercent;
    }
  }
  const percent = matchPercent === null ? base : Math.round(base * 0.7 + matchPercent * 0.3);

  const groups = (["technique", "structure", "donnees", "contenu"] as GroupId[]).map((g) => {
    const rs = results.filter((r) => r.group === g);
    const t = rs.reduce((a, r) => a + r.weight, 0);
    const v = rs.reduce((a, r) => a + r.weight * r.score, 0);
    return { id: g, label: GROUP_LABEL[lang][g], percent: Math.round((v / t) * 100) };
  });

  const lost = results.filter((r) => r.score < 0.95).sort((a, b) => b.weight * (1 - b.score) - a.weight * (1 - a.score));
  let nextTip: string | null = lost[0]?.tip ?? null;
  if (keywords && keywords.matchPercent < 70 && keywords.missing.length > 0) {
    const lostKw = (30 * (1 - keywords.matchPercent / 100)) / 100;
    const lostBase = lost[0] ? (lost[0].weight * (1 - lost[0].score)) / total : 0;
    if (lostKw > lostBase * 0.7) {
      nextTip =
        lang === "fr"
          ? `Ajoutez les mots-clés de l'offre qui vous manquent (ex. ${keywords.missing.slice(0, 3).map((k) => k.term).join(", ")}) si vous les maîtrisez vraiment.`
          : `Add the job-ad keywords you are missing (e.g. ${keywords.missing.slice(0, 3).map((k) => k.term).join(", ")}) if you really have those skills.`;
    }
  }

  const tier: ATSReport["tier"] = percent >= 80 ? "excellent" : percent >= 55 ? "bon" : "faible";

  return {
    isCv,
    docType,
    percent,
    baseScore: base,
    matchPercent,
    tier,
    criteria: results,
    groups,
    nextTip,
    capReason,
    keywords,
    parsed: p,
    wordCount: p.wordCount,
  };
}

// Raccourcis
export function analyzePdfLayout(layout: PdfLayout, opts: { lang?: Lang; jobText?: string } = {}): ATSReport {
  return scoreParsed(parseLayout(layout), opts);
}

export function analyzeCvData(cv: CVData, opts: { jobText?: string } = {}): ATSReport {
  return scoreParsed(parseCvData(cv), { lang: cv.langue, jobText: opts.jobText });
}
