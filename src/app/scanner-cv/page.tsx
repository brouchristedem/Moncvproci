"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileUp,
  Loader2,
  Pencil,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { analyzeRawCvText, RawATSResult } from "@/lib/atsScoreRaw";
import { ENTRY_GATE_KEY } from "@/lib/entryGate";
import { extractPdfText } from "@/lib/pdfText";
import { saveScannerHandoff } from "@/lib/cvImportCore";

type Status = "idle" | "reading" | "error" | "done";

// Outil gratuit et autonome : on ne demande pas de compte, on n'enregistre
// rien nulle part (analyse 100% côté client, dans le navigateur). Sert de
// porte d'entrée SEO/acquisition vers l'éditeur payant. Une fois le score
// affiché, la personne peut importer CE MÊME CV dans l'éditeur pour
// l'améliorer : le texte du PDF est transmis à l'éditeur (sessionStorage),
// qui le fait structurer par l'IA après accord explicite. Les deux CTA posent
// le flag sessionStorage de la page d'accueil pour ne pas se faire bloquer
// par le garde-fou de l'éditeur.
export default function ScannerCvPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<RawATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Le fichier analysé est gardé pour pouvoir l'importer dans l'éditeur sans
  // redemander le PDF à la personne.
  const fileRef = useRef<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setImportError(null);
    setConsent(false);
    fileRef.current = null;
    setFileName(file.name);

    if (file.type !== "application/pdf") {
      setStatus("error");
      setError("Seuls les fichiers PDF sont acceptés pour le moment.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus("error");
      setError("Le fichier est trop volumineux (10 Mo max).");
      return;
    }

    setStatus("reading");
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + " ";
      }

      if (fullText.trim().length < 20) {
        setStatus("error");
        setError(
          "Impossible d'extraire le texte de ce PDF (probablement un scan/image). Essayez un CV exporté directement depuis un traitement de texte."
        );
        return;
      }

      const analysis = analyzeRawCvText(fullText);
      fileRef.current = file;
      setResult(analysis);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Une erreur est survenue pendant la lecture du fichier. Réessayez avec un autre PDF.");
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const goToEditor = () => {
    try {
      window.sessionStorage.setItem(ENTRY_GATE_KEY, "1");
    } catch {
      // sessionStorage indisponible (navigation privée stricte) : tant pis,
      // l'éditeur redirigera vers l'accueil dans ce cas.
    }
  };

  // Transmet le CV analysé à l'éditeur, qui le structure (rubriques, postes,
  // formations…) pour que la personne puisse l'améliorer directement.
  const importIntoEditor = async () => {
    const file = fileRef.current;
    if (!file || !result || !consent) return;
    setImportError(null);
    setImporting(true);
    try {
      const text = await extractPdfText(file);
      if (text.length > 12000) {
        setImportError("Ce CV est trop long pour l'import automatique (3 pages maximum). Essayez avec un PDF plus court.");
        setImporting(false);
        return;
      }
      saveScannerHandoff({ text, fileName: file.name, percent: result.percent });
      goToEditor();
      router.push("/editor");
    } catch {
      setImportError("Impossible de préparer l'import. Réessayez, ou ouvrez l'éditeur et importez le PDF depuis la première rubrique.");
      setImporting(false);
    }
  };

  const barColor =
    result?.tier === "excellent" ? "bg-green-500" : result?.tier === "bon" ? "bg-brand-600" : "bg-amber-500";
  const tierLabel =
    result?.tier === "excellent" ? "Excellent" : result?.tier === "bon" ? "Bon" : "À améliorer";
  const tierTextColor =
    result?.tier === "excellent" ? "text-green-600" : result?.tier === "bon" ? "text-brand-600" : "text-amber-600";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-background/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-foreground/60 hover:text-foreground transition">
          <ArrowLeft size={15} /> Accueil
        </Link>
        <span className="font-bold text-base sm:text-lg tracking-tight">MON CV PRO CI</span>
        <span className="w-16" aria-hidden />
      </header>

      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400 bg-brand-600/10 px-3 py-1.5 rounded-full mb-5">
            <ShieldCheck size={13} /> Outil gratuit · aucune inscription requise
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            Testez la compatibilité ATS de votre CV
          </h1>
          <p className="text-sm sm:text-base text-foreground/60 mb-8">
            Déposez votre CV actuel au format PDF. L&apos;analyse se fait directement dans votre
            navigateur — rien n&apos;est envoyé ni stocké sur un serveur, sauf si vous choisissez
            ensuite d&apos;importer votre CV dans l&apos;éditeur.
          </p>

          {status !== "done" && (
            <label
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border hover:border-brand-600/50 bg-surface transition cursor-pointer px-6 py-12"
            >
              <input type="file" accept="application/pdf" className="hidden" onChange={onInputChange} />
              {status === "reading" ? (
                <>
                  <Loader2 size={28} className="text-brand-600 animate-spin" />
                  <p className="text-sm text-foreground/60">Analyse de {fileName}…</p>
                </>
              ) : (
                <>
                  <FileUp size={28} className="text-brand-600" />
                  <p className="text-sm font-medium">Cliquez ou déposez votre CV (PDF)</p>
                  <p className="text-xs text-foreground/40">10 Mo maximum</p>
                </>
              )}
            </label>
          )}

          {status === "error" && error && (
            <p className="mt-4 text-sm text-red-600 bg-red-600/10 rounded-2xl px-4 py-3">{error}</p>
          )}

          {status === "done" && result && (
            <div className="text-left rounded-2xl border border-border bg-surface p-6 mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                  Score ATS · {fileName}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                  <span className={tierTextColor}>{tierLabel}</span>
                  <span>{result.percent}%</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden mb-5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${result.percent}%` }}
                />
              </div>

              {result.nextTip && (
                <div className="flex items-start gap-2 rounded-2xl bg-accent-600/10 px-3 py-2.5 mb-4">
                  <ArrowRight size={14} className="flex-shrink-0 mt-0.5 text-accent-700" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-700 mb-0.5">
                      Prochaine amélioration
                    </p>
                    <p className="text-sm text-foreground/70 leading-snug">{result.nextTip}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 mb-6">
                {result.criteria.map((c) => (
                  <div key={c.label} className="flex items-start gap-2 text-sm">
                    {c.done ? (
                      <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-green-600" />
                    ) : (
                      <Circle size={15} className="flex-shrink-0 mt-0.5 text-foreground/25" />
                    )}
                    <span className={c.done ? "text-foreground/60" : "text-foreground/45"}>{c.label}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-brand-600/40 bg-brand-600/5 p-4 space-y-3">
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Pencil size={15} /> Améliorez ce CV dans l&apos;éditeur
                  </h2>
                  <p className="mt-1 text-xs text-foreground/60 leading-relaxed">
                    On reprend ce même CV : vos expériences, formations et compétences sont placées
                    automatiquement dans l&apos;éditeur. Vous choisissez un modèle, corrigez les points
                    ci-dessus et suivez votre score ATS en direct.
                  </p>
                </div>
                <label className="flex items-start gap-2 text-[11px] text-foreground/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <span>
                    J&apos;accepte que le contenu de mon CV (sans email ni téléphone) soit envoyé à un service
                    d&apos;IA tiers pour remplir l&apos;éditeur. L&apos;analyse du score ci-dessus, elle, reste dans
                    votre navigateur.{" "}
                    <Link href="/cgu#confidentialite" target="_blank" className="underline hover:text-foreground">
                      En savoir plus
                    </Link>
                  </span>
                </label>
                <button
                  onClick={importIntoEditor}
                  disabled={!consent || importing}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 text-white px-5 py-3 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-40"
                >
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Importer ce CV et l&apos;améliorer
                </button>
                {importError && <p className="text-xs text-red-600">{importError}</p>}
                <p className="text-[11px] text-foreground/45">
                  Un compte gratuit est demandé pour l&apos;import. Le téléchargement du CV final se fait
                  dans l&apos;éditeur, avec aperçu avant paiement.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-3">
                <Link
                  href="/editor"
                  onClick={goToEditor}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-border px-5 py-3 text-sm font-medium hover:border-foreground/30 transition"
                >
                  Repartir d&apos;un CV vide
                </Link>
                <button
                  onClick={() => {
                    setStatus("idle");
                    setResult(null);
                    setFileName(null);
                    setConsent(false);
                    fileRef.current = null;
                  }}
                  className="px-5 py-3 text-sm font-medium border border-border rounded-2xl hover:border-foreground/30 transition"
                >
                  Tester un autre CV
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-foreground/35 mt-6">
            Analyse heuristique locale, à titre indicatif — elle ne reproduit pas un logiciel ATS
            précis mais repère les points que la plupart d&apos;entre eux vérifient.
          </p>
        </div>
      </section>
    </main>
  );
}
