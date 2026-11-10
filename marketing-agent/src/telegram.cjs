"use strict";
// Envoi vers Telegram (Bot API). Fichiers en multipart, textes en JSON.
const fs = require("fs");
const path = require("path");

const api = (m) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${m}`;

async function call(method, form) {
  const res = await fetch(api(method), { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(`Telegram ${method} : ${json.description || res.status}`);
  return json;
}

function fileForm(field, file, extra = {}) {
  const f = new FormData();
  f.set("chat_id", process.env.TELEGRAM_CHAT_ID);
  for (const [k, v] of Object.entries(extra)) f.set(k, v);
  f.set(field, new Blob([fs.readFileSync(file)]), path.basename(file));
  return f;
}

const sendPhoto = (file, caption) => call("sendPhoto", fileForm("photo", file, caption ? { caption } : {}));
// Les affiches sont aussi envoyées en document pour garder la qualité d'origine (Telegram compresse les photos).
const sendDocument = (file) => call("sendDocument", fileForm("document", file));
const sendVideo = (file, caption) =>
  call("sendVideo", fileForm("video", file, { supports_streaming: "true", width: "1080", height: "1920", ...(caption ? { caption } : {}) }));
const sendMessage = (text) => {
  const f = new FormData();
  f.set("chat_id", process.env.TELEGRAM_CHAT_ID);
  f.set("text", text.slice(0, 4000));
  return call("sendMessage", f);
};

module.exports = { sendPhoto, sendDocument, sendVideo, sendMessage };
