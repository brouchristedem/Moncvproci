"use strict";
// Outil de contrôle visuel : rend toutes les affiches de la banque (et l'offre) dans out/preview/.
const fs = require("fs");
const path = require("path");
const { renderPostHtml } = require("./templates.cjs");
const { launch, screenshotHtml } = require("./browser.cjs");

(async () => {
  const root = path.join(__dirname, "..");
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "config.json"), "utf8"));
  const bank = JSON.parse(fs.readFileSync(path.join(root, "content-bank.json"), "utf8"));
  const out = path.join(root, "out", "preview");
  fs.mkdirSync(out, { recursive: true });
  const only = process.argv[2]; // ex. "tip" pour ne rendre qu'un type
  const browser = await launch();
  const jobs = [];
  for (const [type, items] of Object.entries(bank)) if (!only || only === type) for (const it of items) jobs.push([type, it]);
  if (!only || only === "offer") jobs.push(["offer", { id: "offer" }]);
  for (const [type, item] of jobs) {
    const file = path.join(out, `${type}-${item.id}.png`);
    await screenshotHtml(browser, renderPostHtml(cfg, type, item), file, { width: 1080, height: 1350 });
    console.log("ok", path.relative(root, file));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
