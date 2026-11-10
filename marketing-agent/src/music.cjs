"use strict";
// Musique de fond 100 % originale (générée avec ffmpeg : accords doux Am–F–C–G) => aucun souci de droits d'auteur.
// Pour utiliser ta propre musique libre de droits : dépose un fichier marketing-agent/assets/music.mp3.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function ensureMusic(outDir, seconds) {
  const custom = path.join(__dirname, "..", "assets", "music.mp3");
  if (fs.existsSync(custom)) return custom;
  const out = path.join(outDir, "music.wav");
  const chords = [[110, 130.81, 164.81, 220], [87.31, 130.81, 174.61, 220], [130.81, 164.81, 196, 261.63], [98, 146.83, 196, 246.94]];
  const seg = 4;
  const n = Math.ceil((seconds + 1) / seg);
  const inputs = [];
  for (let i = 0; i < n; i++) {
    const c = chords[i % 4];
    const expr = c.map((f, k) => `${0.22 - k * 0.03}*sin(2*PI*${f}*t)+${0.05}*sin(2*PI*${f * 2.003}*t)`).join("+");
    inputs.push(`aevalsrc='${expr}':d=${seg + 0.5}:s=44100`);
  }
  const args = ["-y", "-loglevel", "error"];
  inputs.forEach((s) => args.push("-f", "lavfi", "-i", s));
  const chain = inputs.map((_, i) => `[${i}]afade=t=in:d=0.5,afade=t=out:st=${seg}:d=0.5[a${i}]`).join(";");
  const cat = inputs.map((_, i) => `[a${i}]`).join("") + `concat=n=${inputs.length}:v=0:a=1,tremolo=f=0.25:d=0.25,lowpass=f=1400,aecho=0.8:0.6:380:0.25,volume=0.9[m]`;
  const r = spawnSync("ffmpeg", [...args, "-filter_complex", chain + ";" + cat, "-map", "[m]", out]);
  if (r.status !== 0) { console.warn("Musique : génération impossible", String(r.stderr)); return null; }
  return out;
}

module.exports = { ensureMusic };
