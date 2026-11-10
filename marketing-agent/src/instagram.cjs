"use strict";
// Publication Instagram via « Instagram API with Instagram Login » (compte Pro, pas besoin de page Facebook).
// - Affiche : l'API exige une URL publique -> on dépose l'image dans le dépôt GitHub (public) puis on passe l'URL brute.
// - Reel : envoi direct du fichier (upload resumable), pas d'hébergement nécessaire.
const fs = require("fs");

const V = process.env.GRAPH_VERSION || "v23.0";
const G = `https://graph.instagram.com/${V}`;
const token = () => process.env.INSTAGRAM_ACCESS_TOKEN;
const uid = () => process.env.INSTAGRAM_USER_ID;
const enabled = () => Boolean(token() && uid());

async function gj(url, opts) {
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Instagram : ${json.error?.message || res.status}`);
  return json;
}

// Dépose un fichier dans le dépôt (API Contents) et renvoie une URL brute immuable (basée sur le commit).
async function hostInRepo(file, repoPath) {
  const repo = process.env.GITHUB_REPOSITORY;
  const gh = process.env.GITHUB_TOKEN;
  if (!repo || !gh) throw new Error("GITHUB_REPOSITORY / GITHUB_TOKEN manquants (à lancer depuis GitHub Actions)");
  const headers = { Authorization: `Bearer ${gh}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };
  const base = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
  let sha;
  const cur = await fetch(base, { headers });
  if (cur.ok) sha = (await cur.json()).sha;
  const put = await fetch(base, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message: "chore(agent): média du jour [skip ci]", content: fs.readFileSync(file).toString("base64"), sha }),
  });
  const j = await put.json();
  if (!put.ok) throw new Error("Dépôt de l'image : " + (j.message || put.status));
  return `https://raw.githubusercontent.com/${repo}/${j.commit.sha}/${repoPath}`;
}

async function waitFinished(id, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const s = await gj(`${G}/${id}?fields=status_code,status&access_token=${token()}`);
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("Traitement Instagram échoué : " + (s.status || s.status_code));
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Instagram met trop de temps à traiter le média");
}

const publish = (creationId) =>
  gj(`${G}/${uid()}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: creationId, access_token: token() }) });

async function postImage(imageUrl, caption) {
  const c = await gj(`${G}/${uid()}/media`, { method: "POST", body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token() }) });
  await waitFinished(c.id);
  return publish(c.id);
}

async function postReel(file, caption) {
  const c = await gj(`${G}/${uid()}/media`, {
    method: "POST",
    body: new URLSearchParams({ media_type: "REELS", upload_type: "resumable", caption, share_to_feed: "true", access_token: token() }),
  });
  const buf = fs.readFileSync(file);
  const up = await fetch(c.uri || `https://rupload.facebook.com/ig-api-upload/${V}/${c.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token()}`, offset: "0", file_size: String(buf.length) },
    body: buf,
  });
  const uj = await up.json().catch(() => ({}));
  if (!up.ok || uj.success === false) throw new Error("Envoi du Reel : " + (uj.debug_info?.message || uj.error?.message || up.status));
  await waitFinished(c.id);
  return publish(c.id);
}

module.exports = { enabled, hostInRepo, postImage, postReel };
