// Reconnaissance d'une lettre de motivation collée en entier. Le rendu
// (LettreRenderer) ajoute déjà lui-même l'en-tête, le destinataire, l'objet,
// « Madame, Monsieur, » et la signature : si le corps contient aussi tout ça,
// les infos apparaissent en double. Ici on sépare la lettre en morceaux, on
// range chaque info dans son champ et on ne garde dans le corps que le texte.
// Tout se passe dans le navigateur, rien n'est envoyé nulle part.

export interface ParsedLettre {
  detected: boolean; // vrai si on a reconnu une vraie lettre (formule d'appel trouvée)
  corps: string;
  ville: string;
  destinataire: string;
  entreprise: string;
  poste: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
}

export interface KnownIdentity {
  prenom?: string;
  nom?: string;
}

const LETTERS = "A-Za-zÀ-ÿ";
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EMAIL_RE_G = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE_G = /(?:\+|00)?\d[\d \t().-]{6,}\d/g;
const CONTACT_LABEL_RE = /\b(e-?mail|mail|courriel|t[ée]l(?:[ée]phone)?\.?|mobile|cel|contact|whatsapp)\b\s*[:.]?/gi;

const SALUT_RE = /^(madame|monsieur|mesdames|messieurs|chère?|cher|bonjour|dear)\b[^\n]{0,70}[,:]\s*$/i;
const SALUT_SHORT_RE = /^(madame,?\s+monsieur|mesdames,?\s+messieurs|madame|monsieur)\s*$/i;
const OBJET_RE = /^(objet|object|subject|réf|ref)\s*[:\-–]\s*(.+)$/i;
const DATE_RE =
  /(\d{1,2}(?:er)?\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i;
const RECIP_RE =
  /^(madame|monsieur|mesdames|messieurs|à l['’]attention|a l['’]attention|attn|service|direction|département|departement|directeur|directrice|responsable|ressources humaines|drh|chef de|recrutement)/i;
const CLOSING_RE =
  /^(cordialement|bien cordialement|respectueusement|sincèrement|sincerement|sincerely|yours (?:sincerely|faithfully)|best regards|salutations(?: distinguées)?|signature)\W*$/i;
const ADDRESS_RE =
  /\b(bp|rue|boulevard|bd|avenue|abidjan|cocody|yopougon|marcory|plateau|koumassi|abobo|bouaké|bouake|san-?pedro|daloa|yamoussoukro|riviera|angré|angre|treichville|port-bouët|adjamé|adjame)\b/i;

function hasContact(line: string): boolean {
  EMAIL_RE_G.lastIndex = 0;
  PHONE_RE_G.lastIndex = 0;
  if (EMAIL_RE.test(line)) return true;
  const phones = line.match(PHONE_RE_G) || [];
  return phones.some((m) => {
    const d = m.replace(/\D/g, "");
    return d.length >= 8 && d.length <= 15 && !/^(?:(?:19|20)\d{2}[\s.,/-]*)+$/.test(m.trim());
  });
}

function stripContacts(line: string): string {
  return line
    .replace(EMAIL_RE_G, "")
    .replace(PHONE_RE_G, (m) => (m.replace(/\D/g, "").length >= 8 ? "" : m))
    .replace(CONTACT_LABEL_RE, "")
    .replace(/[|•·,;:\-–\s]+$/g, "")
    .replace(/^[|•·,;:\-–\s]+/g, "")
    .trim();
}

function isNameLike(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 45 || /\d|@/.test(t) || /[.!?]$/.test(t)) return false;
  const words = t.split(/\s+/);
  if (words.length < 1 || words.length > 5) return false;
  return words.every((w) => new RegExp(`^[A-ZÀ-Ý][${LETTERS}'’-]*$`).test(w));
}

function sameName(line: string, known?: KnownIdentity): boolean {
  if (!known) return false;
  const l = line.toLowerCase();
  const parts = [known.prenom, known.nom]
    .filter((x): x is string => !!x && x.trim().length > 1)
    .map((x) => x.trim().toLowerCase());
  return parts.length > 0 && parts.some((p) => l.includes(p));
}

function splitName(full: string): { prenom: string; nom: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  const isUpper = (w: string) => w.length > 1 && w === w.toUpperCase();
  const upper = words.filter(isUpper);
  const others = words.filter((w) => !isUpper(w));
  if (upper.length > 0 && others.length > 0) return { nom: upper.join(" "), prenom: others.join(" ") };
  if (words.length === 1) return { prenom: words[0], nom: "" };
  if (upper.length === words.length) return { nom: words[0], prenom: words.slice(1).join(" ") };
  return { prenom: words[0], nom: words.slice(1).join(" ") };
}

function posteFromObjet(objet: string): string {
  const clean = (s: string) => s.trim().replace(/[.\s]+$/g, "");
  const m = objet.match(/\bposte\s+(?:de\s+|d['’]\s*|du\s+|en\s+tant\s+que\s+)?(.+)$/i);
  if (m) return clean(m[1]);
  return clean(
    objet.replace(/^(candidature|demande)\s+(spontanée\s+)?(pour|au|à)?\s*(le|un|l['’])?\s*/i, "")
  );
}

function cityFromDateLine(line: string): string {
  const idx = line.search(DATE_RE);
  const before = idx > 0 ? line.slice(0, idx) : "";
  return before
    .replace(/^(fait\s+)?(à|a)\s+/i, "")
    .replace(/[,\s]*(le)?[\s,]*$/i, "")
    .trim();
}

export function parseLettre(raw: string, known?: KnownIdentity): ParsedLettre {
  const empty: ParsedLettre = {
    detected: false,
    corps: raw,
    ville: "",
    destinataire: "",
    entreprise: "",
    poste: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
  };

  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/g, ""));

  // 1) Formule d'appel (« Madame, Monsieur, ») dans les premières lignes.
  const limit = Math.min(lines.length, 30);
  let salut = -1;
  for (let i = 0; i < limit; i++) {
    const t = lines[i].trim();
    if (t && (SALUT_RE.test(t) || SALUT_SHORT_RE.test(t))) {
      salut = i;
      break;
    }
  }
  if (salut === -1) return empty;
  // Si plusieurs formules se suivent, on garde la dernière.
  for (;;) {
    let j = salut + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    if (j < lines.length && j - salut <= 2 && (SALUT_RE.test(lines[j].trim()) || SALUT_SHORT_RE.test(lines[j].trim()))) salut = j;
    else break;
  }

  const headerLines = lines.slice(0, salut);
  const bodyLines = lines.slice(salut + 1);

  // 2) En-tête : coordonnées, date/ville, objet, expéditeur, destinataire.
  const headerText = headerLines.join("\n");
  const emailMatch = headerText.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0] : "";
  let telephone = "";
  for (const m of headerText.match(PHONE_RE_G) || []) {
    const d = m.replace(/\D/g, "");
    if (d.length >= 8 && d.length <= 15 && !/^(?:(?:19|20)\d{2}[\s.,/-]*)+$/.test(m.trim())) {
      telephone = m.trim();
      break;
    }
  }

  let ville = "";
  let poste = "";
  let contactsFound = !!(email || telephone);
  const rest: string[] = []; // lignes restantes (vides conservées pour repérer les blocs)

  for (const l of headerLines) {
    const t = l.trim();
    if (!t) {
      rest.push("");
      continue;
    }
    const obj = t.match(OBJET_RE);
    if (obj) {
      poste = posteFromObjet(obj[2]);
      continue;
    }
    if (DATE_RE.test(t) && t.length <= 60) {
      const c = cityFromDateLine(t);
      if (c && !ville) ville = c;
      continue;
    }
    if (hasContact(t)) {
      contactsFound = true;
      const remain = stripContacts(t);
      if ((remain.match(new RegExp(`[${LETTERS}]`, "g")) || []).length >= 3) rest.push(remain);
      continue;
    }
    rest.push(t);
  }

  const flat = rest.filter(Boolean);
  const blocks: string[][] = [];
  {
    let cur: string[] = [];
    for (const l of rest) {
      if (l) cur.push(l);
      else if (cur.length) {
        blocks.push(cur);
        cur = [];
      }
    }
    if (cur.length) blocks.push(cur);
  }

  let senderLines: string[] = [];
  let recipLines: string[] = [];
  const looksLikeSender = (b: string[]) => b.some((l) => sameName(l, known) || isNameLike(l) || ADDRESS_RE.test(l) || /\d/.test(l));
  if (blocks.length >= 2 && (contactsFound || looksLikeSender(blocks[0])) && !RECIP_RE.test(blocks[0][0])) {
    senderLines = blocks[0];
    recipLines = blocks.slice(1).flat();
  } else {
    const firstRecip = flat.findIndex((l) => RECIP_RE.test(l));
    if (firstRecip !== -1) {
      senderLines = flat.slice(0, firstRecip);
      recipLines = flat.slice(firstRecip);
    } else if (blocks.length >= 2) {
      recipLines = blocks[blocks.length - 1];
      senderLines = blocks.slice(0, -1).flat();
    } else if (flat.length > 0) {
      const first = flat[0];
      if (sameName(first, known) || (contactsFound && isNameLike(first))) senderLines = flat;
      else recipLines = flat;
    }
  }

  // Expéditeur : nom puis adresse.
  let prenom = "";
  let nom = "";
  const addr: string[] = [];
  let nameTaken = false;
  for (const l of senderLines) {
    if (!nameTaken && (sameName(l, known) || isNameLike(l)) && !ADDRESS_RE.test(l)) {
      const n = splitName(l);
      prenom = n.prenom;
      nom = n.nom;
      nameTaken = true;
    } else if (/\d/.test(l) || ADDRESS_RE.test(l)) {
      addr.push(l);
    }
  }

  // Destinataire : poste/titre de la personne, puis nom de l'entreprise.
  let destinataire = "";
  let entreprise = "";
  for (const l0 of recipLines) {
    const l = l0.replace(/^(à|a)\s+l['’]attention\s+(de\s+la\s+|de\s+l['’]\s*|du\s+|de\s+)?/i, "").trim();
    if (!l) continue;
    if (RECIP_RE.test(l0) && !destinataire) {
      destinataire = l.charAt(0).toUpperCase() + l.slice(1);
    } else if (!entreprise && !/\d/.test(l) && !ADDRESS_RE.test(l) && !RECIP_RE.test(l)) {
      entreprise = l;
    }
  }

  // 3) Corps : on retire la signature, la formule de politesse seule et les coordonnées en bas.
  const body = [...bodyLines];
  let sigName = "";
  for (let guard = 0; guard < 6 && body.length; guard++) {
    const last = body[body.length - 1].trim();
    if (!last) {
      body.pop();
    } else if (CLOSING_RE.test(last)) {
      body.pop();
    } else if (last.length < 60 && hasContact(last)) {
      body.pop();
    } else if (isNameLike(last) && (sameName(last, known) || last.split(/\s+/).length >= 2 || last === last.toUpperCase())) {
      if (!sigName) sigName = last;
      body.pop();
    } else {
      break;
    }
  }
  while (body.length && !body[0].trim()) body.shift();

  if (!nameTaken && sigName) {
    const n = splitName(sigName);
    prenom = n.prenom;
    nom = n.nom;
  }

  const corps = body
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    detected: true,
    corps,
    ville,
    destinataire,
    entreprise,
    poste,
    prenom,
    nom,
    email,
    telephone,
    adresse: addr.join(", "),
  };
}
