"use strict";
// Vidéo verticale 1080x1920 (TikTok / Reels) : accroche -> points un par un -> appel à l'action.
// Rendu déterministe : une fonction render(t) positionne tout, on capture chaque image avec Chromium
// puis ffmpeg assemble le MP4 (H.264, compatible téléphone).
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { esc, fmt, LOGO, ICON_CHECK, ICON_CROSS, fontFile } = require("./templates.cjs");

const FPS = 24;
const HOOK = 3.2;
const STEP = 2.3;
const HOLD = 1.6;
const CTA = 3.2;

// Convertit n'importe quel type de contenu en { hook, points[] }.
function toScript(cfg, type, item) {
  if (type === "tip") return { hook: item.title, points: item.points.map((p) => ({ h: p.h, t: p.t })) };
  if (type === "dodont")
    return { hook: item.title, points: [{ h: "À éviter", t: item.bad, kind: "bad" }, { h: "À faire", t: item.good, kind: "good" }] };
  if (type === "question") return { hook: item.question, points: item.options.map((o, i) => ({ h: "ABC"[i], t: o, kind: "opt" })), ask: true };
  if (type === "rule") return { hook: item.rule, points: [{ h: item.kicker || "À retenir", t: item.why }] };
  return {
    hook: `${cfg.offer.name} : ${fmt(cfg.offer.price)} FCFA`,
    points: cfg.offer.points.map((t) => ({ h: "", t, kind: "good" })),
  };
}

function buildHtml(cfg, type, item) {
  const b = cfg.brand;
  const sc = toScript(cfg, type, item);
  const n = sc.points.length;
  const listStart = HOOK;
  const listEnd = HOOK + n * STEP + HOLD;
  const total = listEnd + CTA;
  const rows = sc.points
    .map((p, i) => {
      const bad = p.kind === "bad", good = p.kind === "good", opt = p.kind === "opt";
      const color = bad ? "#FF6B76" : good ? "#3DD598" : b.orange;
      const badge = opt
        ? `<div class="badge" style="background:${b.orange}">${esc(p.h)}</div>`
        : bad ? `<div class="badge" style="background:${color};padding:18px">${ICON_CROSS}</div>`
        : good ? `<div class="badge" style="background:${color};padding:18px">${ICON_CHECK}</div>`
        : `<div class="badge" style="background:${b.orange}">${i + 1}</div>`;
      const head = !opt && p.h && !good && !bad ? `<div class="rh">${esc(p.h)}</div>` : bad || good ? `<div class="rl" style="color:${color}">${esc(p.h.toUpperCase())}</div>` : "";
      const st = bad ? "text-decoration:line-through;text-decoration-color:rgba(255,107,118,.8);color:rgba(255,255,255,.8)" : "";
      return `<div class="row" data-s="${(listStart + i * STEP).toFixed(2)}" style="border-color:${bad ? "#FF6B76" : good ? "#3DD598" : "rgba(255,255,255,.16)"}">
        ${badge}<div class="rb">${head}<div class="rt" style="${st}">${esc(p.t)}</div></div></div>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"SG";font-weight:700;src:url("${fontFile("space-grotesk", "space-grotesk-latin-700-normal.woff2")}") format("woff2");}
@font-face{font-family:"IN";font-weight:400;src:url("${fontFile("inter", "inter-latin-400-normal.woff2")}") format("woff2");}
@font-face{font-family:"IN";font-weight:700;src:url("${fontFile("inter", "inter-latin-700-normal.woff2")}") format("woff2");}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;background:${b.deep}}
.c{position:relative;width:1080px;height:1920px;overflow:hidden;color:#fff;font-family:"IN",sans-serif;
 background:radial-gradient(1000px 800px at 95% -4%,rgba(21,122,82,.65),transparent 62%),radial-gradient(800px 700px at -8% 106%,rgba(242,107,29,.18),transparent 60%),linear-gradient(165deg,${b.forest},${b.deep})}
.brand{position:absolute;left:80px;top:150px;display:flex;align-items:center;gap:20px;font-family:"SG";font-weight:700;font-size:34px;letter-spacing:.06em}
.scene{position:absolute;left:80px;right:80px;top:300px;bottom:360px;display:flex;flex-direction:column;justify-content:center;gap:34px}
.hook{font-family:"SG";font-weight:700;font-size:112px;line-height:1.1;letter-spacing:-.015em;text-wrap:balance;overflow:hidden;max-height:760px}
.bar{width:180px;height:16px;border-radius:8px;background:${b.orange}}
.row{display:flex;align-items:center;gap:32px;padding:34px 38px;border-radius:44px;background:rgba(255,255,255,.08);border:2.5px solid;margin-bottom:6px}
.badge{flex:none;width:92px;height:92px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"SG";font-weight:700;font-size:50px}
.rh{font-family:"SG";font-weight:700;font-size:50px;line-height:1.1;margin-bottom:8px}
.rl{font-weight:700;font-size:30px;letter-spacing:.14em;margin-bottom:8px}
.rt{font-size:44px;line-height:1.28;color:rgba(255,255,255,.9);text-wrap:pretty}
.rh+.rt{color:rgba(255,255,255,.78);font-size:42px}
.ctaScene{align-items:center;text-align:center}
.cta{background:${b.orange};color:#fff;font-weight:700;font-size:56px;padding:34px 64px;border-radius:999px;box-shadow:0 18px 48px rgba(242,107,29,.4)}
.big{font-family:"SG";font-weight:700;font-size:92px;line-height:1.1}
.prog{position:absolute;left:0;bottom:0;height:12px;background:${b.orange}}
</style></head><body><div class="c">
<div class="brand">${LOGO.replace('width="64" height="64"', 'width="72" height="72"')}<span>${esc(b.name)}</span></div>
<div class="scene" id="hook" data-s="0" data-e="${HOOK}"><div class="bar"></div><div class="hook">${esc(sc.hook)}</div></div>
<div class="scene" id="list" data-s="${listStart}" data-e="${listEnd}">${rows}${sc.ask ? `<div class="rh" style="text-align:center;color:${b.orange};margin-top:20px">Réponds en commentaire</div>` : ""}</div>
<div class="scene ctaScene" id="cta" data-s="${listEnd}" data-e="${total + 1}"><div class="big">Crée ton CV</div><div class="cta">${esc(b.url)}</div></div>
<div class="prog" id="prog"></div></div>
<script>
(async()=>{
  await document.fonts.ready;
  const h=document.querySelector('.hook');let s=112;
  while(h.scrollHeight>h.clientHeight+s*0.12&&s>60){s-=4;h.style.fontSize=s+'px';}
  const ease=x=>1-Math.pow(1-x,3), clamp=x=>Math.max(0,Math.min(1,x));
  window.render=(t)=>{
    for(const el of document.querySelectorAll('.scene')){
      const a=+el.dataset.s,e=+el.dataset.e;
      const inn=ease(clamp((t-a)/0.5)), out=el.id==='cta'?1:1-clamp((t-(e-0.35))/0.35);
      el.style.opacity=(t>=a&&t<=e)?Math.min(inn,out):0;
      el.style.transform='translateY('+((1-inn)*40)+'px)';
    }
    for(const r of document.querySelectorAll('.row')){
      const k=ease(clamp((t-(+r.dataset.s))/0.45));
      r.style.opacity=k;r.style.transform='translateY('+((1-k)*60)+'px) scale('+(0.96+0.04*k)+')';
    }
    document.getElementById('prog').style.width=(1080*clamp(t/${total.toFixed(2)}))+'px';
  };
  window.render(0);document.body.dataset.ready='1';
})();
</script></body></html>`;
  return { html, total };
}

async function renderVideo(browser, cfg, type, item, outMp4) {
  const { html, total } = buildHtml(cfg, type, item);
  const tmp = path.join(require("os").tmpdir(), `video-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(tmp, html);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("file://" + tmp);
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 15000 });
  const ff = spawn(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outMp4],
    { stdio: ["pipe", "inherit", "inherit"] }
  );
  const done = new Promise((res, rej) => { ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg code " + c)))); ff.on("error", rej); });
  const frames = Math.ceil(total * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
  await ctx.close();
  fs.unlinkSync(tmp);
  return { seconds: total };
}

module.exports = { renderVideo, toScript };
