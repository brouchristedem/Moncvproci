"use strict";
// Choix du type de post, de l'idée (banque ou IA Groq) et construction des légendes.
const { toScript } = require("./video.cjs");

const BANNED = /garanti|garantie|100 ?%|étude|etude|statistique|selon des|prouvé|prouve|recruteurs? (?:disent|pensent)|\d+ ?%/i;

// Prochain type : on suit la rotation selon le nombre de posts déjà faits.
function pickType(cfg, history, forced) {
  if (forced) return forced;
  return cfg.rotation[history.length % cfg.rotation.length];
}

// Idée de la banque : la moins récemment utilisée de ce type.
function pickFromBank(bank, type, history) {
  const items = bank[type] || [];
  if (!items.length) return null;
  const lastUse = (id) => {
    const i = history.map((h) => h.id).lastIndexOf(id);
    return i; // -1 = jamais utilisée
  };
  return [...items].sort((a, b) => lastUse(a.id) - lastUse(b.id))[0];
}

const SCHEMAS = {
  tip: `{"title":"3 conseils/erreurs ... (max 40 caractères)","points":[{"h":"titre court (max 28 car.)","t":"une phrase d'explication (max 70 car.)"},{"h":"","t":""},{"h":"","t":""}]}`,
  dodont: `{"title":"sujet court (max 28 caractères)","bad":"mauvais exemple réaliste (max 70 car.)","good":"bonne version (max 80 car.)"}`,
  question: `{"question":"question engageante (max 60 car.)","options":["option A (max 32 car.)","option B","option C"]}`,
  rule: `{"kicker":"Règle n°N","rule":"règle courte (max 40 car.)","why":"une phrase d'explication (max 100 car.)"}`,
};

function validate(type, o) {
  const s = (v, max) => typeof v === "string" && v.trim().length > 2 && v.length <= max;
  const texts = [];
  let ok = false;
  if (type === "tip") {
    ok = s(o.title, 48) && Array.isArray(o.points) && o.points.length === 3 && o.points.every((p) => s(p.h, 34) && s(p.t, 84));
    if (ok) texts.push(o.title, ...o.points.flatMap((p) => [p.h, p.t]));
  } else if (type === "dodont") {
    ok = s(o.title, 34) && s(o.bad, 84) && s(o.good, 96);
    if (ok) texts.push(o.title, o.bad, o.good);
  } else if (type === "question") {
    ok = s(o.question, 70) && Array.isArray(o.options) && o.options.length === 3 && o.options.every((x) => s(x, 38));
    if (ok) texts.push(o.question, ...o.options);
  } else if (type === "rule") {
    ok = s(o.kicker, 20) && s(o.rule, 48) && s(o.why, 120);
    if (ok) texts.push(o.kicker, o.rule, o.why);
  }
  if (!ok) return false;
  for (const t of texts) {
    if (BANNED.test(t)) return false;
    // aucun chiffre inventé : seuls "1 page", "2 pages", "3 ..." (petits nombres) et "Règle n°N" passent
    const nums = t.match(/\d+/g) || [];
    if (nums.some((n) => Number(n) > 5)) return false;
  }
  return true;
}

// Génère une idée originale avec Groq (gratuit). Renvoie null en cas d'échec : on retombe sur la banque.
async function generateWithAI(cfg, type, history) {
  const key = process.env.GROQ_API_KEY;
  if (!key || !SCHEMAS[type]) return null;
  const recent = history.slice(-12).map((h) => h.key).filter(Boolean).join(" | ");
  const topic = cfg.aiTopics[Math.floor(Math.random() * cfg.aiTopics.length)];
  const prompt = `Tu écris du contenu pour des affiches Instagram/TikTok du site MON CV PRO CI (créateur de CV et lettres de motivation pour les jeunes en Côte d'Ivoire : étudiants, stagiaires, premiers emplois).
Sujet du jour : ${topic}.
Type : ${type}. Réponds UNIQUEMENT avec un objet JSON de cette forme : ${SCHEMAS[type]}
Règles strictes : français simple, tutoiement, phrases courtes, conseil concret et vrai, utile pour un CV en Côte d'Ivoire.
INTERDIT : pourcentages, statistiques, études, chiffres précis sur les recruteurs, promesses (« garanti », « tu seras embauché »), témoignages, noms de personnes ou d'entreprises.
Ne répète pas ces idées déjà publiées : ${recent || "aucune"}.`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error("Groq HTTP " + res.status);
    const data = await res.json();
    const obj = JSON.parse(data.choices[0].message.content);
    if (!validate(type, obj)) throw new Error("contenu rejeté par le validateur");
    const keyText = obj.title || obj.question || obj.rule;
    if (history.some((h) => h.key === keyText)) throw new Error("doublon");
    return { id: "ai-" + Date.now(), ...obj };
  } catch (e) {
    console.warn("IA indisponible, on utilise la banque :", e.message);
    return null;
  }
}

const itemKey = (type, it) => it.title || it.question || it.rule || (type === "offer" ? "offre" : it.id);

function buildCaptions(cfg, type, item) {
  const url = cfg.brand.url;
  const tags = cfg.hashtags.join(" ");
  const tt = cfg.hashtags.slice(0, 5).join(" ") + " #pourtoi";
  let body = "";
  let hook = "";
  if (type === "tip") {
    hook = item.title;
    body = item.points.map((p, i) => `${i + 1}. ${p.h} : ${p.t}`).join("\n");
  } else if (type === "dodont") {
    hook = `${item.title} : à éviter / à faire`;
    body = `❌ ${item.bad}\n✅ ${item.good}`;
  } else if (type === "question") {
    hook = item.question;
    body = item.options.map((o, i) => `${"ABC"[i]}. ${o}`).join("\n") + "\n\nRéponds en commentaire 👇";
  } else if (type === "rule") {
    hook = item.rule;
    body = item.why;
  } else {
    hook = `${cfg.offer.name} : ${String(cfg.offer.price).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
    body = cfg.offer.points.map((p) => `✅ ${p}`).join("\n");
  }
  const instagram = `${hook}\n\n${body}\n\n👉 Crée ton CV sur ${url} (lien en bio)\n\n${tags}`;
  const tiktok = `${hook} ${tt}\n\n${body}\n\n👉 ${url}`;
  return { instagram, tiktok };
}

module.exports = { pickType, pickFromBank, generateWithAI, buildCaptions, itemKey, validate };
