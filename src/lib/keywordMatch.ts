// Correspondance CV ↔ offre d'emploi, comme le fait un ATS : on extrait les
// mots-clés importants de l'offre (compétences, outils, intitulés, diplômes),
// puis on regarde lesquels apparaissent dans le CV. 100 % local, aucun envoi.

export interface JobKeyword {
  term: string; // forme affichée (telle qu'écrite dans l'offre)
  count: number; // nombre d'occurrences dans l'offre
  present: boolean; // trouvé dans le CV ?
}

export interface KeywordResult {
  keywords: JobKeyword[];
  matchPercent: number; // 0-100, part des mots-clés de l'offre retrouvés dans le CV
  present: JobKeyword[];
  missing: JobKeyword[];
}

export function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");
}

const STOP = new Set(
  (
    // FR
    "le la les un une des du de d l au aux et ou ni mais donc car que qui quoi dont ou ce cet cette ces se sa son ses leur leurs nous vous ils elles il elle on je tu me te mon ton ma ta mes tes notre votre nos vos y en a as ont est sont etre avoir fait faire faut doit doivent peut peuvent pour par avec sans sous sur dans chez vers entre plus moins tres bien aussi comme si ne pas non oui tout tous toute toutes autre autres meme meme ainsi alors afin lors lorsque depuis pendant avant apres ci cela ceci celui celle ceux celles etc " +
      // EN
      "the a an and or but of to in on at by for with from as is are was were be been being this that these those it its their our your you we they he she his her not no yes will would can could should may might must have has had do does did than then so such into over under about up out more most less very also"
  ).split(/\s+/)
);

// Mots très fréquents dans les offres mais qui ne disent rien du métier.
const JOB_FILLER = new Set(
  (
    "poste postes recherche recherchons recrutons recrute offre emploi mission missions profil profils entreprise societe groupe equipe candidat candidats candidature candidatures h f hf cdi cdd stage alternance temps plein partiel lieu contrat salaire remuneration avantages rejoindre rejoignez nous vous ideal ideale idealement souhaite souhaitez souhaitons sera serez etes capable capables esprit sens bon bonne bonnes bons excellent excellente excellents maitrise maitriser maitrisant maitrisez maitrisons connaissance maitrisee connaissances experience experiences annee annees an ans minimum requis requise requises obligatoire poste a pourvoir description responsabilites responsable principales principaux principal sein notre votre dynamique motive motivee autonome rigoureux rigoureuse " +
      "job role position team company candidate candidates apply application looking seeking join we offer offers responsibilities requirements required preferred plus years year experience skills ability strong good great excellent knowledge understanding work working including etc based location full time part time"
  ).split(/\s+/)
);

function tokenize(text: string): string[] {
  return foldText(text)
    .replace(/[^a-z0-9+#./' -]/g, " ")
    .split(/[\s]+/)
    .map((t) => t.replace(/^[-'./]+|[-'./]+$/g, ""))
    .filter(Boolean);
}

// Racine très simple : retire le pluriel pour que « logiciels » = « logiciel ».
export function stemToken(t: string): string {
  if (t.length > 4 && t.endsWith("s")) return t.slice(0, -1);
  if (t.length > 5 && t.endsWith("x")) return t.slice(0, -1);
  return t;
}

function isUseful(tok: string): boolean {
  if (tok.length < 2) return false;
  if (STOP.has(tok) || JOB_FILLER.has(tok)) return false;
  if (/^\d+$/.test(tok)) return false;
  return true;
}

// Sections d'une offre qui contiennent les exigences : leurs mots pèsent plus.
const REQ_HEAD = /(profil|competences?|requis|exigences?|qualifications?|requirements?|skills?|must|vous maitrisez|vous avez|nous recherchons|formation|diplome)/;

export function extractJobKeywords(jobText: string, max = 24): { term: string; count: number }[] {
  const lines = jobText.split(/\r?\n/);
  const uni = new Map<string, { count: number; shown: string; weight: number }>();
  const bi = new Map<string, { count: number; shown: string; weight: number }>();
  let inReq = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const folded = foldText(line);
    if (line.length < 60 && /[:]$|^[A-ZÉÈÀ ]{5,}$/.test(line)) inReq = REQ_HEAD.test(folded);
    const boost = inReq || /^[-•*▪●·]/.test(line) ? 1.6 : 1;

    const words = line.split(/[\s,;:()/|]+/).filter(Boolean);
    const toks = words.map((w) => ({ shown: w.replace(/^[^A-Za-zÀ-ÿ0-9+#]+|[^A-Za-zÀ-ÿ0-9+#]+$/g, ""), t: tokenize(w)[0] || "" }));
    for (let i = 0; i < toks.length; i++) {
      const a = toks[i];
      if (!a.t || !isUseful(a.t)) continue;
      const key = stemToken(a.t);
      const cur = uni.get(key) ?? { count: 0, shown: a.shown, weight: 0 };
      cur.count += 1;
      cur.weight += boost;
      uni.set(key, cur);

      const b = toks[i + 1];
      if (b && b.t && isUseful(b.t)) {
        const bkey = `${stemToken(a.t)} ${stemToken(b.t)}`;
        const bc = bi.get(bkey) ?? { count: 0, shown: `${a.shown} ${b.shown}`, weight: 0 };
        bc.count += 1;
        bc.weight += boost;
        bi.set(bkey, bc);
      }
    }
  }

  type Cand = { key: string; term: string; count: number; score: number; n: 1 | 2 };
  const cands: Cand[] = [];
  for (const [key, v] of bi) {
    // Une expression de 2 mots n'est retenue que si elle se répète ou vient d'une liste d'exigences.
    if (v.count >= 2 || v.weight > v.count) cands.push({ key, term: v.shown, count: v.count, score: v.weight * 1.4, n: 2 });
  }
  for (const [key, v] of uni) {
    if (v.shown.length < 2) continue;
    cands.push({ key, term: v.shown, count: v.count, score: v.weight, n: 1 });
  }
  cands.sort((a, b) => b.score - a.score || b.count - a.count);

  const picked: Cand[] = [];
  const coveredByBigram = new Set<string>();
  for (const c of cands) {
    if (picked.length >= max) break;
    if (c.n === 1 && coveredByBigram.has(c.key)) continue;
    picked.push(c);
    if (c.n === 2) c.key.split(" ").forEach((p) => coveredByBigram.add(p));
  }
  return picked.map((c) => ({ term: c.term, count: c.count }));
}

// Le terme est-il présent dans le texte du CV ? (mots entiers, accents et pluriels ignorés)
export function cvHasTerm(cvFolded: string, term: string): boolean {
  const toks = tokenize(term).map(stemToken).filter(Boolean);
  if (toks.length === 0) return false;
  const re = new RegExp(
    toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|x)?").join("[\\s,;:/()|-]+") + "(?![a-z0-9])",
    "i"
  );
  const pre = "(?:^|[^a-z0-9])";
  return new RegExp(pre + re.source, "i").test(cvFolded);
}

export function matchKeywords(cvText: string, jobText: string, max = 24): KeywordResult {
  const cvFolded = foldText(cvText);
  const keywords: JobKeyword[] = extractJobKeywords(jobText, max).map((k) => ({
    ...k,
    present: cvHasTerm(cvFolded, k.term),
  }));
  const present = keywords.filter((k) => k.present);
  const missing = keywords.filter((k) => !k.present);
  const matchPercent = keywords.length ? Math.round((present.length / keywords.length) * 100) : 0;
  return { keywords, matchPercent, present, missing };
}
