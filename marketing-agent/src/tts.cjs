"use strict";
// Voix off : Piper (open source, gratuit, tourne sur GitHub Actions). Si la voix n'est pas installée,
// l'agent produit quand même la vidéo (musique seule).
// TTS_FAKE=1 génère de simples bips (test des durées/synchro sans voix réelle).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const VOICE = process.env.PIPER_VOICE || "fr_FR-siwis-medium";
const DATA = process.env.PIPER_DATA || path.join(__dirname, "..", "voices");
const PY = process.env.PIPER_PY || "python3";

// Texte « prononçable » : sigles épelés, prix en toutes lettres, URL lue à voix haute.
function clean(t) {
  return String(t)
    .replace(/moncvproci\.com/gi, "mon C V pro C I point com")
    .replace(/\bMON CV PRO CI\b/g, "Mon C V Pro C I")
    .replace(/1\s?500\s?FCFA/gi, "mille cinq cents francs C F A")
    .replace(/\bFCFA\b/g, "francs C F A")
    .replace(/\bCV\b/g, "C V")
    .replace(/\bPDF\b/g, "P D F")
    .replace(/\s\+\s/g, " plus ")
    .replace(/n°\s?(\d+)/gi, "numéro $1")
    .replace(/ /g, " ");
}

function available() {
  if (process.env.TTS_FAKE) return true;
  const r = spawnSync(PY, ["-c", "import piper"], { stdio: "ignore" });
  return r.status === 0 && fs.existsSync(path.join(DATA, VOICE + ".onnx"));
}

function duration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return parseFloat(r.stdout) || 0;
}

// Renvoie { file, seconds } ou null.
function synth(text, outWav) {
  const spoken = clean(text);
  if (process.env.TTS_FAKE) {
    const d = Math.max(1, spoken.length * 0.065);
    spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", `sine=f=300:d=${d.toFixed(2)}`, "-ar", "22050", outWav]);
    return { file: outWav, seconds: duration(outWav) };
  }
  const r = spawnSync(PY, ["-m", "piper", "-m", VOICE, "--data-dir", DATA, "-f", outWav], { input: spoken, encoding: "utf8" });
  if (r.status !== 0 || !fs.existsSync(outWav)) {
    console.warn("Voix : échec de synthèse —", (r.stderr || "").split("\n").slice(-3).join(" "));
    return null;
  }
  return { file: outWav, seconds: duration(outWav) };
}

module.exports = { available, synth, clean };
