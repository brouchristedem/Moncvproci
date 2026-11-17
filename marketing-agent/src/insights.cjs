"use strict";
// Boucle d'auto-amélioration : lit les VRAIS chiffres du compte Instagram (likes, commentaires, et
// enregistrements/partages/portée quand l'autorisation « insights » est disponible), repère les types
// de posts qui marchent le mieux et oriente la rotation. Aucun chiffre inventé, tout vient d'Instagram.
const fs = require("fs");
const path = require("path");

const V = process.env.GRAPH_VERSION || "v23.0";
const G = `https://${process.env.INSTAGRAM_API_HOST || "graph.facebook.com"}/${V}`;
const token = () => process.env.INSTAGRAM_ACCESS_TOKEN;
const uid = () => process.env.INSTAGRAM_USER_ID;

async function gj(url) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json.error?.message || "HTTP " + res.status);
  return json;
}

// Derniers médias avec leurs compteurs. Les insights (portée, enregistrements, partages) sont facultatifs.
async function fetchMedia(limit = 50) {
  const list = await gj(`${G}/${uid()}/media?fields=id,caption,timestamp,media_type,like_count,comments_count&limit=${limit}&access_token=${token()}`);
  const media = list.data || [];
  for (const m of media) {
    try {
      const metric = m.media_type === "VIDEO" ? "reach,saved,shares" : "reach,saved,shares";
      const ins = await gj(`${G}/${m.id}/insights?metric=${metric}&access_token=${token()}`);
      for (const d of ins.data || []) m[d.name] = d.values?.[0]?.value ?? 0;
    } catch {
      /* autorisation insights absente : on se contente des likes et commentaires */
    }
  }
  return media;
}

// Score d'engagement : un commentaire / enregistrement / partage vaut plus qu'un like.
const score = (m) => (m.like_count || 0) + 2 * (m.comments_count || 0) + 3 * (m.saved || 0) + 3 * (m.shares || 0);

// Retrouve le type de post à partir de la légende (la légende commence par l'accroche = history.key).
function typeOf(caption, history, cfg) {
  const c = String(caption || "");
  const offer = cfg.offer?.name;
  for (const h of [...history].reverse()) {
    if (h.type === "offer") {
      if (offer && c.includes(offer)) return "offer";
    } else if (h.key && c.includes(h.key)) return h.type;
  }
  return null;
}

function byType(media, history, cfg) {
  const acc = {};
  for (const m of media) {
    const t = typeOf(m.caption, history, cfg);
    if (!t) continue;
    (acc[t] ||= { n: 0, total: 0, best: null });
    const s = score(m);
    acc[t].n++;
    acc[t].total += s;
    if (!acc[t].best || s > acc[t].best.score) acc[t].best = { score: s, caption: String(m.caption || "").split("\n")[0], likes: m.like_count || 0, comments: m.comments_count || 0 };
  }
  for (const t of Object.keys(acc)) acc[t].avg = acc[t].total / acc[t].n;
  return acc;
}

// Type le plus performant (hors offre), s'il y a assez de données (au moins 3 médias par type).
function bestType(stats) {
  const ranked = Object.entries(stats)
    .filter(([t, s]) => t !== "offer" && s.n >= 3)
    .sort((a, b) => b[1].avg - a[1].avg);
  return ranked.length >= 2 && ranked[0][1].avg > ranked[ranked.length - 1][1].avg ? ranked[0][0] : null;
}

const LABEL = { tip: "Conseils", dodont: "À éviter / à faire", question: "Questions", rule: "Règles d'or", offer: "Offre" };

async function followers() {
  try {
    const j = await gj(`${G}/${uid()}?fields=followers_count,media_count&access_token=${token()}`);
    return j.followers_count ?? null;
  } catch {
    return null;
  }
}

// Bilan hebdomadaire (texte Telegram). Enregistre aussi le nombre d'abonnés pour suivre la progression.
async function weeklyReport(root, cfg, history, media, stats) {
  const statsFile = path.join(root, "stats.json");
  const log = fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile, "utf8")) : [];
  const f = await followers();
  const today = new Date().toISOString().slice(0, 10);
  const prev = log.length ? log[log.length - 1] : null;
  if (f != null) {
    log.push({ date: today, followers: f });
    fs.writeFileSync(statsFile, JSON.stringify(log.slice(-120), null, 2) + "\n");
  }
  const lines = ["📊 BILAN DE LA SEMAINE (chiffres réels d'Instagram)"];
  if (f != null) lines.push(`👥 Abonnés : ${f}${prev ? ` (${f - prev.followers >= 0 ? "+" : ""}${f - prev.followers} depuis le ${prev.date})` : ""}`);
  const rows = Object.entries(stats).sort((a, b) => b[1].avg - a[1].avg);
  if (rows.length) {
    lines.push("", "Engagement moyen par type (likes + 2×commentaires + 3×enregistrements/partages) :");
    for (const [t, s] of rows) lines.push(`• ${LABEL[t] || t} : ${s.avg.toFixed(1)} (${s.n} publications)`);
    const top = rows[0];
    if (top[1].best) lines.push("", `🏆 Meilleur post : « ${top[1].best.caption} » (${top[1].best.likes} likes, ${top[1].best.comments} commentaires)`);
  } else {
    lines.push("", "Pas encore assez de publications pour comparer les types de posts.");
  }
  const bt = bestType(stats);
  lines.push("", bt ? `🤖 L'agent va proposer un peu plus souvent : ${LABEL[bt] || bt}.` : "🤖 Rotation normale (pas encore assez de données pour trancher).");
  return lines.join("\n");
}

module.exports = { fetchMedia, byType, bestType, weeklyReport, score };
