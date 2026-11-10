"use strict";
// Modèles d'affiches 1080x1350 (format portrait 4:5, idéal Instagram).
// Chaque modèle renvoie une page HTML complète ; le rendu PNG est fait par Chromium.
const path = require("path");

const fontFile = (pkg, file) =>
  "file://" + path.join(__dirname, "..", "node_modules", "@fontsource", pkg, "files", file);

// Typographie française : apostrophes courbes, espaces insécables avant ? ! : ; », après «,
// et entre un chiffre et le mot qui le suit (« 5 jours », « 1 page » ne se coupent plus).
const typo = (s) =>
  String(s ?? "")
    .replace(/'/g, "\u2019")
    .replace(/\s+([?!:;»])/g, "\u00A0$1")
    .replace(/«\s+/g, "«\u00A0")
    .replace(/(\d)\s+(?=[A-Za-zÀ-ÿ])/g, "$1\u00A0");
const esc = (s) =>
  typo(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const LOGO = `<svg viewBox="0 0 512 512" width="64" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="112" fill="#157A52"/><rect x="152" y="96" width="208" height="288" rx="28" fill="#FFFFFF"/><rect x="184" y="148" width="144" height="16" rx="8" fill="#0C3B2E"/><rect x="184" y="184" width="112" height="12" rx="6" fill="#9DCDB7"/><rect x="184" y="208" width="128" height="12" rx="6" fill="#9DCDB7"/><rect x="184" y="232" width="96" height="12" rx="6" fill="#9DCDB7"/><circle cx="256" cy="340" r="72" fill="#0C3B2E"/><path d="M226 340l22 22 40-46" stroke="#FFFFFF" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="352" cy="150" r="22" fill="#F26B1D"/></svg>`;

const ICON_CHECK = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
const ICON_CROSS = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

// CSS commun : fond vert forêt + halo émeraude (comme l'image d'aperçu du site).
const baseCss = (b) => `
@font-face{font-family:"SG";font-weight:700;src:url("${fontFile("space-grotesk", "space-grotesk-latin-700-normal.woff2")}") format("woff2");}
@font-face{font-family:"IN";font-weight:400;src:url("${fontFile("inter", "inter-latin-400-normal.woff2")}") format("woff2");}
@font-face{font-family:"IN";font-weight:600;src:url("${fontFile("inter", "inter-latin-600-normal.woff2")}") format("woff2");}
@font-face{font-family:"IN";font-weight:700;src:url("${fontFile("inter", "inter-latin-700-normal.woff2")}") format("woff2");}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:${b.deep}}
.canvas{position:relative;width:1080px;height:1350px;overflow:hidden;color:#fff;font-family:"IN",sans-serif;
  background:radial-gradient(900px 620px at 92% -4%,rgba(21,122,82,.62),transparent 62%),radial-gradient(700px 520px at -6% 108%,rgba(242,107,29,.16),transparent 60%),linear-gradient(165deg,${b.forest} 0%,${b.deep} 100%)}
.head{position:absolute;left:80px;right:80px;top:64px;height:72px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:18px;font-family:"SG";font-weight:700;font-size:30px;letter-spacing:.06em}
.tag{font-weight:700;font-size:24px;letter-spacing:.14em;color:${b.orange};background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.16);padding:13px 24px;border-radius:999px}
.foot{position:absolute;left:80px;right:80px;bottom:62px;height:86px;display:flex;align-items:center;justify-content:center}
.cta{background:${b.orange};color:#fff;font-weight:700;font-size:34px;padding:0 48px;height:86px;border-radius:999px;display:flex;align-items:center;gap:14px;box-shadow:0 14px 36px rgba(242,107,29,.35)}
.title{position:absolute;left:80px;right:80px;font-family:"SG";font-weight:700;line-height:1.12;letter-spacing:-.015em;overflow:hidden;display:flex;align-items:flex-start}
.title span{display:block;flex:1;min-width:0;text-wrap:balance}
.ct,.bal{text-wrap:pretty}
.hl{color:${b.orange}}
.card{background:rgba(255,255,255,.075);border:1.5px solid rgba(255,255,255,.15);border-radius:40px;backdrop-filter:blur(2px)}
.num{flex:none;width:92px;height:92px;border-radius:50%;background:${b.orange};font-family:"SG";font-weight:700;font-size:50px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(242,107,29,.35)}
`;

const fitScript = `
(async()=>{
  await document.fonts.ready;
  document.querySelectorAll('[data-fit]').forEach(el=>{
    let size=parseFloat(getComputedStyle(el).fontSize);
    const min=parseFloat(el.dataset.fit)||36;
    while((el.scrollHeight>el.clientHeight+size*0.12||el.scrollWidth>el.clientWidth+1)&&size>min){size-=2;el.style.fontSize=size+'px';}
  });
  document.body.dataset.ready='1';
})();`;

const page = (cfg, inner) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${baseCss(cfg.brand)}</style></head><body>
<div class="canvas">${inner}</div><script>${fitScript}</script></body></html>`;

const header = (cfg, tag) => `<div class="head"><div class="brand">${LOGO.replace('width="64" height="64"', 'width="60" height="60"')}<span>${esc(cfg.brand.name)}</span></div><div class="tag">${esc(tag)}</div></div>`;
const footer = (cfg) => `<div class="foot"><div class="cta">Crée ton CV · ${esc(cfg.brand.url)}</div></div>`;

// ---------- Modèle « conseil » : titre + 3 points numérotés ----------
function tip(cfg, item) {
  const cards = item.points
    .map(
      (p, i) => `<div class="card" style="flex:1;display:flex;align-items:center;gap:34px;padding:0 40px">
      <div class="num">${i + 1}</div>
      <div class="ct" data-fit="22" style="flex:1;height:170px;overflow:hidden;font-size:32px;display:flex;flex-direction:column;justify-content:center;gap:8px">
        <div style="font-family:SG;font-weight:700;font-size:1.28em;line-height:1.12">${esc(p.h)}</div>
        <div style="font-size:1em;line-height:1.32;color:rgba(255,255,255,.8)">${esc(p.t)}</div>
      </div></div>`
    )
    .join("");
  return page(
    cfg,
    `${header(cfg, "CONSEIL CV")}
    <div style="position:absolute;left:80px;right:80px;top:172px;bottom:176px;display:flex;flex-direction:column;gap:44px">
      <h1 class="title" data-fit="52" style="position:static;flex:none;max-height:270px;font-size:86px"><span>${esc(item.title)}</span></h1>
      <div style="flex:1;display:flex;flex-direction:column;gap:26px">${cards}</div>
    </div>
    ${footer(cfg)}`
  );
}

// ---------- Modèle « à faire / à éviter » ----------
function dodont(cfg, item) {
  const row = (kind, label, text) => {
    const bad = kind === "bad";
    const color = bad ? "#FF6B76" : "#3DD598";
    const bg = bad ? "rgba(110,26,38,.55)" : "rgba(21,122,82,.42)";
    return `<div style="flex:1;border-radius:44px;background:${bg};border:2.5px solid ${color};padding:34px 46px;display:flex;flex-direction:column;gap:14px;min-height:0">
      <div style="display:flex;align-items:center;gap:20px">
        <div style="flex:none;width:64px;height:64px;border-radius:50%;background:${color};padding:15px">${bad ? ICON_CROSS : ICON_CHECK}</div>
        <div style="font-weight:700;font-size:28px;letter-spacing:.14em;color:${color}">${label}</div>
      </div>
      <div class="bal" data-fit="30" style="flex:1;min-height:0;overflow:hidden;display:flex;align-items:center;font-family:SG;font-weight:700;font-size:56px;line-height:1.14;${bad ? "text-decoration:line-through;text-decoration-thickness:3px;text-decoration-color:rgba(255,107,118,.75);color:rgba(255,255,255,.8)" : ""}"><span>${esc(text)}</span></div>
    </div>`;
  };
  return page(
    cfg,
    `${header(cfg, "À ÉVITER / À FAIRE")}
    <div style="position:absolute;left:80px;right:80px;top:172px;bottom:176px;display:flex;flex-direction:column;gap:40px">
      <h1 class="title" data-fit="52" style="position:static;flex:none;max-height:200px;font-size:86px"><span>${esc(item.title)}</span></h1>
      <div style="flex:1;display:flex;flex-direction:column;gap:28px;min-height:0">
        ${row("bad", "À ÉVITER", item.bad)}
        ${row("good", "À FAIRE", item.good)}
      </div>
    </div>
    ${footer(cfg)}`
  );
}

// ---------- Modèle « question » (engagement en commentaires) ----------
function question(cfg, item) {
  const letters = ["A", "B", "C", "D"];
  const opts = item.options
    .map(
      (o, i) => `<div class="card" style="height:120px;display:flex;align-items:center;gap:28px;padding:0 34px;border-radius:999px">
      <div style="flex:none;width:70px;height:70px;border-radius:50%;background:${cfg.brand.orange};font-family:SG;font-weight:700;font-size:38px;display:flex;align-items:center;justify-content:center">${letters[i]}</div>
      <div data-fit="26" style="flex:1;height:84px;overflow:hidden;display:flex;align-items:center;font-weight:600;font-size:40px;line-height:1.1">${esc(o)}</div></div>`
    )
    .join("");
  return page(
    cfg,
    `${header(cfg, "QUESTION DU JOUR")}
    <div style="position:absolute;left:80px;right:80px;top:172px;bottom:176px;display:flex;flex-direction:column;gap:40px">
      <h1 class="title" data-fit="56" style="position:static;flex:none;max-height:390px;font-size:92px"><span>${esc(item.question)}</span></h1>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:24px">
        ${opts}
        <div style="margin-top:18px;text-align:center;font-weight:700;font-size:38px;color:${cfg.brand.orange}">${esc("Réponds en commentaire : " + item.options.map((_, i) => letters[i]).join(", ").replace(/, ([^,]*)$/, " ou $1"))}</div>
      </div>
    </div>
    ${footer(cfg)}`
  );
}

// ---------- Modèle « règle d'or » ----------
function rule(cfg, item) {
  return page(
    cfg,
    `${header(cfg, "À RETENIR")}
    <div style="position:absolute;left:80px;right:80px;top:172px;bottom:176px;display:flex;flex-direction:column;justify-content:center;gap:34px">
      <div style="font-weight:700;font-size:34px;letter-spacing:.16em;color:${cfg.brand.orange}">${esc(String(item.kicker || "À retenir").toUpperCase())}</div>
      <div style="width:170px;height:14px;border-radius:7px;background:${cfg.brand.orange}"></div>
      <h1 class="title" data-fit="64" style="position:static;flex:none;max-height:380px;font-size:122px"><span>${esc(item.rule)}</span></h1>
      <div class="bal" data-fit="30" style="max-height:260px;overflow:hidden;font-size:44px;line-height:1.36;color:rgba(255,255,255,.84)">${esc(item.why)}</div>
    </div>
    ${footer(cfg)}`
  );
}

// ---------- Modèle « offre » : le Pass Candidature (toutes les infos viennent de config.json) ----------
function offer(cfg) {
  const o = cfg.offer;
  const items = o.points
    .map(
      (t) => `<div style="display:flex;align-items:center;gap:24px"><div style="flex:none;width:48px;height:48px;border-radius:50%;background:${cfg.brand.emerald};padding:11px">${ICON_CHECK}</div><div style="font-size:36px;line-height:1.2;font-weight:600">${esc(t)}</div></div>`
    )
    .join("");
  return page(
    cfg,
    `${header(cfg, "OFFRE")}
    <div style="position:absolute;left:80px;right:80px;top:176px;height:1050px;border-radius:56px;background:#fff;color:${cfg.brand.ink};padding:58px 62px;display:flex;flex-direction:column">
      <div style="font-weight:700;font-size:30px;letter-spacing:.1em;color:${cfg.brand.orange}">${esc(o.name.toUpperCase())}</div>
      <div style="display:flex;align-items:baseline;gap:18px;margin-top:14px"><div style="font-family:SG;font-weight:700;font-size:176px;line-height:1;color:${cfg.brand.forest}">${fmt(o.price)}</div><div style="font-weight:700;font-size:44px;color:rgba(26,46,40,.6)">FCFA</div></div>
      <div style="font-size:36px;color:rgba(26,46,40,.72);margin-top:10px">un seul paiement, valable ${o.days} jours</div>
      <div style="height:2px;background:${cfg.brand.mint};margin:38px 0"></div>
      <div style="display:flex;flex-direction:column;gap:34px">${items}</div>
      <div style="margin-top:auto;height:96px;border-radius:999px;background:${cfg.brand.orange};color:#fff;font-weight:700;font-size:36px;display:flex;align-items:center;justify-content:center">Crée ton CV · ${esc(cfg.brand.url)}</div>
    </div>`
  );
}

const TEMPLATES = { tip, dodont, question, rule, offer };

function renderPostHtml(cfg, type, item) {
  const fn = TEMPLATES[type];
  if (!fn) throw new Error(`Modèle inconnu : ${type}`);
  return fn(cfg, item);
}

module.exports = { renderPostHtml, esc, fmt, LOGO, ICON_CHECK, ICON_CROSS, fontFile };
