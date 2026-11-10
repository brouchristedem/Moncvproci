"use strict";
// Lance Chromium. En local (test), CHROMIUM_PATH peut pointer vers un Chromium déjà installé.
const { chromium } = require("playwright");

async function launch() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
}

// Rend une page HTML en PNG (on écrit le HTML dans un fichier pour que les polices locales se chargent).
async function screenshotHtml(browser, html, outPng, { width, height }) {
  const fs = require("fs");
  const os = require("os");
  const path = require("path");
  const tmp = path.join(os.tmpdir(), `agent-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmp, html);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto("file://" + tmp);
  await page.waitForFunction(() => document.body.dataset.ready === "1", null, { timeout: 15000 });
  await page.screenshot({ path: outPng, type: "png" });
  await ctx.close();
  fs.unlinkSync(tmp);
}

module.exports = { launch, screenshotHtml };
