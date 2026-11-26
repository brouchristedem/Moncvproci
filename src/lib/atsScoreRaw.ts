// Analyse heuristique d'un CV externe (texte brut extrait d'un PDF non
// généré par MON CV PRO CI). Contrairement à computeATSScore (src/lib/atsScore.ts)
// qui travaille sur des CVData structurées, ici on ne dispose que du texte
// brut extrait par pdf.js : les signaux sont donc plus grossiers, mais
// suffisants pour donner un diagnostic actionnable en quelques secondes.

export interface RawATSCriterion {
  label: string;
  tip: string;
  done: boolean;
  weight: number;
}

export type RawDocType = "cv" | "lettre" | "autre";

export interface RawATSResult {
  // Le texte ressemble-t-il vraiment à un CV ? Sinon le score n'a pas de sens.
  isCv: boolean;
  docType: RawDocType;
  // Rubriques de CV reconnues (ex : « Expérience », « Formation »…), pour expliquer le verdict.
  foundSections: string[];
  percent: number;
  tier: "excellent" | "bon" | "faible";
  criteria: RawATSCriterion[];
  nextTip: string | null;
  wordCount: number;
}

const ACTION_VERBS = [
  // FR
  "géré", "gérée", "dirigé", "dirigée", "développé", "développée", "créé", "créée",
  "piloté", "pilotée", "conçu", "conçue", "optimisé", "optimisée", "augmenté", "augmentée",
  "réduit", "réduite", "amélioré", "améliorée", "coordonné", "coordonnée", "supervisé",
  "supervisée", "mis en place", "lancé", "lancée", "négocié", "négociée", "formé", "formée",
  "analysé", "analysée", "livré", "livrée", "atteint", "atteinte", "généré", "générée",
  // EN
  "managed", "led", "developed", "created", "built", "designed", "optimized", "increased",
  "reduced", "improved", "coordinated", "supervised", "launched", "negotiated", "trained",
  "analyzed", "delivered", "achieved", "generated", "implemented",
];

const EDUCATION_WORDS = [
  "formation", "diplôme", "diplome", "université", "universite", "licence", "master",
  "baccalauréat", "baccalaureat", "bts", "bac+", "école", "ecole", "degree", "university",
  "bachelor", "education", "graduated",
];

const SKILLS_WORDS = [
  "compétences", "competences", "compétence", "skills", "maîtrise", "maitrise",
  "logiciels", "outils", "langages",
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s.-]{7,}\d)/;
const YEAR_RE = /\b(19|20)\d{2}\b/g;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const WORD_CHARS = "a-zà-ÿ";

// Recherche d'un mot ou d'une expression entière (pas au milieu d'un autre mot :
// « information » ne doit pas compter comme « formation »).
function hasWord(lowerText: string, word: string): boolean {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^${WORD_CHARS}])${esc}(?![${WORD_CHARS}])`).test(lowerText);
}

function includesAny(lowerText: string, words: string[]): boolean {
  return words.some((w) => hasWord(lowerText, w));
}

// Rubriques typiques d'un CV, FR + EN. Au moins 2 familles différentes sont
// attendues dans un vrai CV.
const SECTION_GROUPS: { label: string; words: string[] }[] = [
  {
    label: "Expérience",
    words: [
      "expérience", "experience", "expériences", "experiences", "parcours professionnel",
      "expérience professionnelle", "work experience", "employment", "professional experience",
      "stage", "stages", "internship", "internships", "emploi", "emplois",
    ],
  },
  {
    label: "Formation",
    words: ["formation", "formations", "éducation", "education", "diplôme", "diplômes", "diplome", "diplomes", "parcours académique", "parcours scolaire", "études", "etudes"],
  },
  {
    label: "Compétences",
    words: ["compétences", "competences", "compétence", "skills", "savoir-faire", "hard skills", "soft skills", "logiciels", "outils"],
  },
  { label: "Langues", words: ["langues", "langue", "languages"] },
  {
    label: "Profil",
    words: ["profil", "profile", "à propos", "objectif professionnel", "objectif", "summary", "about me", "résumé professionnel"],
  },
  {
    label: "Autres rubriques",
    words: ["centres d'intérêt", "centres d’intérêt", "loisirs", "interests", "hobbies", "certifications", "certification", "projets", "projects", "références", "references", "bénévolat", "benevolat"],
  },
];

// Marques d'une lettre de motivation (et non d'un CV).
const LETTER_MARKERS = [
  "madame, monsieur", "madame monsieur", "dear sir", "objet :", "objet:", "veuillez agréer",
  "je vous prie d'agréer", "je vous prie d’agréer", "cordialement", "dans l'attente de votre réponse",
  "dans l’attente de votre réponse", "je me permets de", "ma candidature", "sincerely", "yours faithfully",
];

const DATE_RANGE_RE =
  /\b(?:(?:19|20)\d{2}|0?[1-9]\/(?:19|20)\d{2}|1[0-2]\/(?:19|20)\d{2})\s*(?:-|–|—|à|au|to|\/)\s*(?:(?:19|20)\d{2}|présent|present|aujourd['’]hui|actuel|actuellement|current|now|ce jour)/i;

export function detectDocument(
  text: string,
  lower: string,
  wordCount: number
): { isCv: boolean; docType: RawDocType; foundSections: string[] } {
  const foundSections = SECTION_GROUPS.filter((g) => includesAny(lower, g.words)).map((g) => g.label);
  const hasContact = EMAIL_RE.test(text) || PHONE_RE.test(text);
  const hasDateRange = DATE_RANGE_RE.test(text);
  const distinctYears = new Set(text.match(YEAR_RE) ?? []).size;
  const letterHits = LETTER_MARKERS.filter((m) => lower.includes(m)).length;

  // Points : rubriques (le signal le plus fiable), puis coordonnées et dates.
  const score =
    Math.min(foundSections.length, 4) +
    (hasContact ? 1 : 0) +
    (hasDateRange ? 1 : 0) +
    (distinctYears >= 2 ? 1 : 0);

  const looksLikeLetter = letterHits >= 2 && foundSections.length < 3;
  const isCv =
    !looksLikeLetter && foundSections.length >= 2 && (hasContact || hasDateRange) && score >= 4 && wordCount <= 2500;

  const docType: RawDocType = isCv ? "cv" : looksLikeLetter ? "lettre" : "autre";
  return { isCv, docType, foundSections };
}

export function analyzeRawCvText(rawText: string): RawATSResult {
  const text = rawText.replace(/\s+/g, " ").trim();
  const lower = text.toLowerCase();
  const wordCount = countWords(text);

  const doc = detectDocument(text, lower, wordCount);

  const checks: { done: boolean; weight: number; tip: string; label: string }[] = [];

  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  checks.push({
    done: hasEmail && hasPhone,
    weight: 15,
    label: "Coordonnées détectées",
    tip: "Assurez-vous que votre email et votre numéro de téléphone apparaissent en clair (pas dans une image ou un en-tête graphique) : les logiciels ATS doivent pouvoir les lire.",
  });

  const years = text.match(YEAR_RE) ?? [];
  const distinctYears = new Set(years);
  checks.push({
    done: distinctYears.size >= 2,
    weight: 15,
    label: "Dates d'expérience repérées",
    tip: "Indiquez clairement les dates (mois/année) de chaque expérience et formation : les ATS trient les candidatures par chronologie.",
  });

  const hasQuantified = /\d/.test(text.replace(EMAIL_RE, "").replace(PHONE_RE, ""));
  checks.push({
    done: hasQuantified,
    weight: 15,
    label: "Résultats chiffrés",
    tip: "Ajoutez des chiffres concrets dans vos expériences (ex : « augmenté les ventes de 20% », « géré une équipe de 8 personnes »).",
  });

  const hasVerbs = includesAny(lower, ACTION_VERBS);
  checks.push({
    done: hasVerbs,
    weight: 15,
    label: "Verbes d'action",
    tip: "Utilisez des verbes d'action (géré, développé, piloté, optimisé...) pour décrire vos expériences plutôt que des phrases passives.",
  });

  const hasEducation = includesAny(lower, EDUCATION_WORDS);
  checks.push({
    done: hasEducation,
    weight: 10,
    label: "Formation identifiable",
    tip: "Faites apparaître clairement une rubrique Formation avec l'intitulé du diplôme et l'établissement.",
  });

  const hasSkills = includesAny(lower, SKILLS_WORDS);
  checks.push({
    done: hasSkills,
    weight: 15,
    label: "Rubrique compétences",
    tip: "Ajoutez une rubrique Compétences clairement identifiée avec des mots-clés liés à votre métier : les ATS filtrent par mots-clés.",
  });

  const lengthDone = wordCount >= 150 && wordCount <= 1000;
  checks.push({
    done: lengthDone,
    weight: 15,
    label: "Longueur adaptée",
    tip: wordCount < 150
      ? "Votre CV semble trop court : détaillez un peu plus vos expériences et compétences."
      : "Votre CV semble très long : un CV trop dense est souvent mal traité par les ATS, essayez d'aller à l'essentiel.",
  });

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const doneWeight = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const percent = Math.round((doneWeight / totalWeight) * 100);
  const tier: RawATSResult["tier"] = percent >= 80 ? "excellent" : percent >= 50 ? "bon" : "faible";

  const unmet = checks.filter((c) => !c.done).sort((a, b) => b.weight - a.weight);

  return {
    isCv: doc.isCv,
    docType: doc.docType,
    foundSections: doc.foundSections,
    percent,
    tier,
    wordCount,
    criteria: checks.map((c) => ({ label: c.label, tip: c.tip, done: c.done, weight: c.weight })),
    nextTip: unmet[0]?.tip ?? null,
  };
}
