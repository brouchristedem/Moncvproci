"use strict";
// Rattrapage Instagram : republie, du plus ancien au plus récent, les posts de history.json
// qui n'ont jamais été publiés sur Instagram (affiche + Reel), sans toucher à Telegram.
// Usage : node src/backfill.cjs [--dry] [--limit=N]   (GitHub Actions : workflow « Rattrapage Instagram »)
const fs = require("fs");
const path = require("path");
const { renderPostHtml } = require("./templates.cjs");
const { launch, screenshotHtml } = require("./browser.cjs");
const { renderVideo } = require("./video.cjs");
const content = require("./content.cjs");
const ig = require("./instagram.cjs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDone = (h) => typeof h.instagram === "string" && h.instagram.startsWith("publié");

(async () => {
  const root = path.join(__dirname, "..");
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const limit = Number((args.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || Infinity;
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const bank = JSON.parse(fs.readFileSync(path.join(root, "content-bank.json"), "utf8"));
  const histFile = path.join(root, "history.json");
  const history = JSON.parse(fs.readFileSync(histFile, "utf8"));

  if (!dry && !ig.enabled()) throw new Error("INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_USER_ID manquants");

  // Vérifie le jeton avant de produire quoi que ce soit.
  if (!dry) {
    const r = await fetch(`https://graph.instagram.com/v23.0/me?fields=user_id,username&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error("Jeton Instagram refusé : " + (j.error?.message || r.status));
    console.log("Compte connecté :", j.username, j.user_id);
  }

  // Ordre = ordre du fichier (chronologique). Tri stable par date au cas où.
  const todo = history
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !isDone(h))
    .sort((a, b) => (a.h.date === b.h.date ? a.i - b.i : a.h.date < b.h.date ? -1 : 1))
    .slice(0, limit);
  console.log(`${todo.length} post(s) à publier :`, todo.map(({ h }) => `${h.date}/${h.id}`).join(", "));

  const out = path.join(root, "out");
  fs.mkdirSync(out, { recursive: true });
  const png = path.join(out, "post.png");
  const mp4 = path.join(out, "post.mp4");
  let failed = false;

  for (const { h } of todo) {
    const type = h.type;
    const item = type === "offer" ? { id: "offer" } : (bank[type] || []).find((x) => x.id === h.id);
    if (!item) {
      console.warn(`Idée introuvable dans la banque (${h.id}) : ignorée.`);
      continue;
    }
    console.log(`\n=== ${h.date} · ${type} · ${h.id}`);
    const browser = await launch();
    try {
      await screenshotHtml(browser, renderPostHtml(cfg, type, item), png, { width: 1080, height: 1350 });
      await renderVideo(browser, cfg, type, item, mp4);
    } finally {
      await browser.close();
    }
    const caps = content.buildCaptions(cfg, type, item);
    if (dry) {
      console.log("--dry : rendu OK, rien publié.");
      continue;
    }
    const done = [];
    try {
      const url = await ig.hostInRepo(png, "marketing-agent/published/latest.png");
      await ig.postImage(url, caps.instagram);
      done.push("affiche");
      await ig.postReel(mp4, caps.instagram);
      done.push("reel");
      h.instagram = "publié (" + done.join(" + ") + ") — rattrapage";
      console.log("✅", h.instagram);
    } catch (e) {
      h.instagram = done.length ? "partiel (" + done.join(", ") + ") : " + e.message : "échec : " + e.message;
      console.error("❌", h.instagram);
      failed = true;
    }
    // On sauvegarde après chaque post : en cas d'arrêt, on ne republie jamais deux fois.
    fs.writeFileSync(histFile, JSON.stringify(history, null, 2) + "\n");
    if (failed) break; // on s'arrête pour garder l'ordre chronologique
    await sleep(90_000); // pause entre deux posts (limites Instagram, feed plus naturel)
  }
  if (failed) process.exit(1);
  console.log("\nRattrapage terminé.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
