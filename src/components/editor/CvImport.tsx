"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileUp, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useCVStore } from "@/lib/store";
import { extractContacts, maskPersonalData } from "@/lib/personalData";
import { extractPdfText } from "@/lib/pdfText";
import {
  ImportedCV,
  ScannerHandoff,
  applyImported,
  clearScannerHandoff,
  hasContent,
  readScannerHandoff,
} from "@/lib/cvImportCore";

const MESSAGES = {
  fr: {
    title: "Importer un CV existant (PDF)",
    hint: "Remplit l'éditeur automatiquement à partir de ton ancien CV. Tu pourras tout corriger ensuite.",
    consent:
      "J'accepte que le contenu de mon CV (sans email ni téléphone) soit envoyé à un service d'IA tiers pour remplir l'éditeur.",
    more: "En savoir plus",
    button: "Choisir un PDF",
    reading: "Lecture du PDF…",
    analysing: "Analyse par l'IA… (10 à 30 secondes)",
    replace: "Ton CV actuel sera remplacé par le contenu importé (tu peux annuler ensuite avec le bouton Annuler de l'éditeur). Continuer ?",
    done: "CV importé. Relis chaque rubrique : l'IA peut se tromper.",
    doneFromScan: "Ton CV du scanner est importé. Relis chaque rubrique, choisis un modèle, puis suis le score ATS pour l'améliorer.",
    login: "Connecte-toi pour utiliser l'import (gratuit).",
    notPdf: "Seuls les fichiers PDF sont acceptés.",
    tooBig: "Fichier trop volumineux (10 Mo max).",
    scan: "Impossible de lire le texte (PDF scanné ou image). Utilise un CV exporté depuis Word ou Google Docs.",
    long: "Ce CV est trop long à analyser. Essaie avec un PDF plus court (3 pages max).",
    quota: "Limite du jour atteinte. Reviens demain.",
    unavailable: "L'IA est momentanément indisponible. Réessaie dans un instant.",
    notConfigured: "L'import n'est pas encore activé.",
    error: "Une erreur est survenue. Réessaie avec un autre PDF.",
    handoffTitle: "Ton CV du scanner est prêt à être importé",
    handoffLogin: "Connecte-toi (gratuit) pour l'importer ici et l'améliorer.",
    handoffLoginCta: "Se connecter",
    handoffImporting: "Import de ton CV du scanner…",
    handoffRetry: "Réessayer l'import",
    handoffDrop: "Ne pas importer",
  },
  en: {
    title: "Import an existing CV (PDF)",
    hint: "Fills the editor automatically from your old CV. You can fix everything afterwards.",
    consent:
      "I agree that my CV content (without email or phone) is sent to a third-party AI service to fill the editor.",
    more: "Learn more",
    button: "Choose a PDF",
    reading: "Reading the PDF…",
    analysing: "AI analysis… (10 to 30 seconds)",
    replace: "Your current CV will be replaced by the imported content (you can undo with the editor's Undo button). Continue?",
    done: "CV imported. Review each section: the AI can make mistakes.",
    doneFromScan: "Your scanned CV is imported. Review each section, pick a template, then follow the ATS score to improve it.",
    login: "Sign in to use the import (free).",
    notPdf: "Only PDF files are accepted.",
    tooBig: "File too large (10 MB max).",
    scan: "Can't read the text (scanned PDF or image). Use a CV exported from Word or Google Docs.",
    long: "This CV is too long to analyse. Try a shorter PDF (3 pages max).",
    quota: "Daily limit reached. Come back tomorrow.",
    unavailable: "AI is temporarily unavailable. Try again shortly.",
    notConfigured: "Import is not enabled yet.",
    error: "Something went wrong. Try another PDF.",
    handoffTitle: "Your scanned CV is ready to import",
    handoffLogin: "Sign in (free) to import it here and improve it.",
    handoffLoginCta: "Sign in",
    handoffImporting: "Importing your scanned CV…",
    handoffRetry: "Retry import",
    handoffDrop: "Don't import",
  },
};

export default function CvImport() {
  const { user, dataLoaded } = useAuth();
  const cv = useCVStore((s) => s.cv);
  const set = useCVStore((s) => s.set);
  const langue = cv.langue;
  const m = MESSAGES[langue];

  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "reading" | "analysing">("idle");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  // CV analysé dans le scanner et en attente d'import (voir /scanner-cv).
  const [handoff, setHandoff] = useState<ScannerHandoff | null>(null);
  const handoffStarted = useRef(false);
  const busy = phase !== "idle";

  // Envoie le texte brut du PDF à l'IA puis remplit l'éditeur. Commun au
  // choix manuel d'un PDF et à l'arrivée depuis le scanner.
  const importRawText = async (raw: string, fromScanner: boolean) => {
    if (!user) {
      setMessage({ text: m.login, ok: false });
      return false;
    }
    if (raw.length < 80) {
      setPhase("idle");
      setMessage({ text: m.scan, ok: false });
      return false;
    }
    if (raw.length > 12000) {
      setPhase("idle");
      setMessage({ text: m.long, ok: false });
      return false;
    }

    try {
      // Coordonnées retrouvées ici, dans le navigateur : elles ne partent pas vers l'IA.
      const contacts = extractContacts(raw);
      const safeText = maskPersonalData(raw);

      setPhase("analysing");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ text: safeText }),
      });
      const json = await res.json().catch(() => ({}));
      setPhase("idle");

      if (!res.ok) {
        const map: Record<string, string> = {
          auth_required: m.login,
          too_short: m.scan,
          too_long: m.long,
          quota_reached: m.quota,
          not_configured: m.notConfigured,
        };
        setMessage({ text: map[json.error] || m.unavailable, ok: false });
        return false;
      }

      if (hasContent(useCVStore.getState().cv) && !window.confirm(m.replace)) return false;
      set((c) => applyImported(c, json.data as ImportedCV, contacts, langue));
      setMessage({ text: fromScanner ? m.doneFromScan : m.done, ok: true });
      return true;
    } catch {
      setPhase("idle");
      setMessage({ text: m.error, ok: false });
      return false;
    }
  };

  const run = async (file: File) => {
    setMessage(null);
    if (!user) return setMessage({ text: m.login, ok: false });
    if (file.type !== "application/pdf") return setMessage({ text: m.notPdf, ok: false });
    if (file.size > 10 * 1024 * 1024) return setMessage({ text: m.tooBig, ok: false });

    try {
      setPhase("reading");
      const raw = await extractPdfText(file);
      await importRawText(raw, false);
    } catch {
      setPhase("idle");
      setMessage({ text: m.error, ok: false });
    }
  };

  // Arrivée depuis le scanner : le texte du PDF est déjà extrait et la
  // personne a déjà donné son accord à l'IA sur la page du scanner. Dès
  // qu'elle est connectée, on lance l'import sans lui redemander le fichier.
  useEffect(() => {
    setHandoff(readScannerHandoff());
  }, []);

  useEffect(() => {
    if (!handoff || !user || !dataLoaded || handoffStarted.current) return;
    handoffStarted.current = true;
    setConsent(true);
    void (async () => {
      const ok = await importRawText(handoff.text, true);
      // En cas de succès (ou si le texte est inutilisable), on ne le garde pas.
      // En cas d'échec réseau/IA, on le garde pour pouvoir réessayer.
      if (ok) {
        clearScannerHandoff();
        setHandoff(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff, user, dataLoaded]);

  const retryHandoff = () => {
    if (!handoff) return;
    setMessage(null);
    void importRawText(handoff.text, true).then((ok) => {
      if (ok) {
        clearScannerHandoff();
        setHandoff(null);
      }
    });
  };

  const dropHandoff = () => {
    clearScannerHandoff();
    setHandoff(null);
    setMessage(null);
  };

  return (
    <div className="mb-4 space-y-3">
      {handoff && (
        <div className="rounded-2xl border border-accent-600/40 bg-accent-600/10 p-3 space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <FileUp size={14} /> {m.handoffTitle}
          </h3>
          <p className="text-[11px] text-foreground/70 break-words">{handoff.fileName}</p>
          {!user ? (
            <>
              <p className="text-[11px] text-foreground/70">{m.handoffLogin}</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
              >
                <LogIn size={13} /> {m.handoffLoginCta}
              </Link>
            </>
          ) : busy ? (
            <p className="flex items-center gap-1.5 text-[11px] text-foreground/70">
              <Loader2 size={13} className="animate-spin" />
              {phase === "reading" ? m.reading : m.handoffImporting}
            </p>
          ) : message && !message.ok ? (
            <div className="space-y-2">
              <p className="text-[11px] text-red-500">{message.text}</p>
              <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={retryHandoff}
                className="rounded-2xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90"
              >
                {m.handoffRetry}
              </button>
              <button
                type="button"
                onClick={dropHandoff}
                className="rounded-2xl border border-border px-3 py-2 text-xs font-medium transition hover:bg-surface-muted"
              >
                {m.handoffDrop}
              </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-brand-600/40 bg-brand-600/5 p-3 space-y-2.5">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <FileUp size={14} /> {m.title}
          </h3>
          <p className="mt-0.5 text-[11px] text-foreground/60">{m.hint}</p>
        </div>

        <label className="flex items-start gap-2 text-[11px] text-foreground/70 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 accent-brand-600"
          />
          <span>
            {m.consent}{" "}
            <Link href="/cgu#confidentialite" target="_blank" className="underline hover:text-foreground">
              {m.more}
            </Link>
          </span>
        </label>

        <button
          type="button"
          disabled={!consent || busy}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
          {phase === "reading" ? m.reading : phase === "analysing" ? m.analysing : m.button}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run(file);
          }}
        />

        {message && (!handoff || message.ok) && (
          <p className={`text-[11px] ${message.ok ? "text-green-600" : "text-red-500"}`}>{message.text}</p>
        )}
      </div>
    </div>
  );
}
