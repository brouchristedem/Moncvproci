"use strict";
// Point d'entrée : node src/run.cjs [--dry] [--no-ai] [--type=tip|dodont|question|rule|offer]
const fs = require("fs");
const path = require("path");
const { renderPostHtml } = require("./templates.cjs");
const { launch, screenshotHtml } = require("./browser.cjs");
const { renderVideo } = require("./video.cjs");
const content = require("./content.cjs");
const tg = require("./telegram.cjs");

(async () => {
  const root = path.join(__dirname, "..");
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const noAI = args.includes("--no-ai");
  const forced = (args.find((a) => a.startsWith("--type=")) || "").split("=")[1] || process.env.POST_TYPE || "";
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const bank = JSON.parse(fs.readFileSync(path.join(root, "content-bank.json"), "utf8"));
  const histFile = path.join(root, "history.json");
  const history = JSON.parse(fs.readFileSync(histFile, "utf8"));

  const type = content.pickType(cfg, history, forced);
  let item = type === "offer" ? { id: "offer" } : null;
  let source = "banque";
  if (!item && !noAI) {
    item = await content.generateWithAI(cfg, type, history);
    if (item) source = "ia";
  }
  if (!item) item = content.pickFromBank(bank, type, history);
  if (!item) throw new Error("Aucune idée disponible pour le type " + type);
  console.log(`Type : ${type} · source : ${source} · idée : ${item.id}`);

  const out = path.join(root, "out");
  fs.mkdirSync(out, { recursive: true });
  const png = path.join(out, "post.png");
  const mp4 = path.join(out, "post.mp4");
  const browser = await launch();
  try {
    await screenshotHtml(browser, renderPostHtml(cfg, type, item), png, { width: 1080, height: 1350 });
    const v = await renderVideo(browser, cfg, type, item, mp4);
    console.log(`Affiche + vidéo (${v.seconds.toFixed(1)} s) prêtes dans out/`);
  } finally {
    await browser.close();
  }
  const caps = content.buildCaptions(cfg, type, item);
  fs.writeFileSync(path.join(out, "caption-instagram.txt"), caps.instagram);
  fs.writeFileSync(path.join(out, "caption-tiktok.txt"), caps.tiktok);

  if (dry) {
    console.log("Mode --dry : rien envoyé, historique inchangé.");
    return;
  }
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID manquants");

  await tg.sendMessage(`📣 Post du jour (${type}) — affiche Instagram + vidéo TikTok/Reels. Les légendes arrivent ensuite, prêtes à copier-coller.`);
  await tg.sendPhoto(png);
  await tg.sendVideo(mp4);
  await tg.sendMessage("📸 LÉGENDE INSTAGRAM :\n\n" + caps.instagram);
  await tg.sendMessage("🎵 LÉGENDE TIKTOK :\n\n" + caps.tiktok);

  history.push({ date: new Date().toISOString().slice(0, 10), type, id: item.id, key: content.itemKey(type, item), source });
  fs.writeFileSync(histFile, JSON.stringify(history.slice(-200), null, 2) + "\n");
  console.log("Envoyé sur Telegram, historique mis à jour.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
