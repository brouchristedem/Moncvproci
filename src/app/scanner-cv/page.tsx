"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileUp,
  FileWarning,
  Loader2,
  Pencil,
  ShieldCheck,
  ArrowLeft,
  CircleDot,
  Target,
} from "lucide-react";
import { analyzePdfLayout, SECTION_LABEL } from "@/lib/atsEngine";
import { layoutFromPdf, PdfLayout } from "@/lib/pdfLayout";
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
  // Le PDF lu avec la position de chaque morceau de texte ; le score se recalcule
  // à partir de lui (ex. quand on colle une offre d'emploi) sans redemander le fichier.
  const [layout, setLayout] = useState<PdfLayout | null>(null);
  const [jobText, setJobText] = useState("");
  const result = useMemo(() => (layout ? analyzePdfLayout(layout, { jobText }) : null), [layout, jobText]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Le fichier analysé est gardé pour pouvoir l'importer dans l'éditeur sans
  // redemander le PDF à la personne.
  const fileRef = useRef<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  // Le document ne ressemble pas à un CV : on n'affiche pas de score, sauf si
  // la personne confirme que c'est bien un CV (mise en page atypique).
  const [forceShow, setForceShow] = useState(false);

  const resetScan = () => {
    setStatus("idle");
    setLayout(null);
    setJobText("");
    setFileName(null);
    setConsent(false);
    setForceShow(false);
    fileRef.current = null;
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLayout(null);
    setJobText("");
    setImportError(null);
    setConsent(false);
    setForceShow(false);
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

      const lay = await layoutFromPdf(pdf);
      const chars = lay.pages.reduce((n, pg) => n + pg.items.reduce((m, it) => m + it.str.trim().length, 0), 0);

      if (chars < 20) {
        setStatus("error");
        setError(
          "Impossible d'extraire le texte de ce PDF (probablement un scan/image). C'est exactement ce qu'un ATS ne sait pas lire : exportez votre CV directement en PDF texte depuis l'éditeur ou un traitement de texte."
        );
        return;
      }

      fileRef.current = file;
      setLayout(lay);
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
          <p className="text-sm sm:text-base text-foreground/80 mb-8">
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
                  <p className="text-sm text-foreground/80">Analyse de {fileName}…</p>
                </>
              ) : (
                <>
                  <FileUp size={28} className="text-brand-600" />
                  <p className="text-sm font-medium">Cliquez ou déposez votre CV (PDF)</p>
                  <p className="text-xs text-foreground/70">10 Mo maximum</p>
                </>
              )}
            </label>
          )}

          {status === "error" && error && (
            <p className="mt-4 text-sm text-red-600 bg-red-600/10 rounded-2xl px-4 py-3">{error}</p>
          )}

          {status === "done" && result && !result.isCv && !forceShow && (
            <div className="text-left rounded-2xl border border-amber-500/50 bg-amber-500/10 p-6 mt-2">
              <h2 className="flex items-center gap-2 text-base font-bold text-foreground mb-2">
                <FileWarning size={18} className="text-amber-600" />
                {result.docType === "lettre" ? "Ce document ressemble à une lettre" : "Ce document ne ressemble pas à un CV"}
              </h2>
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {result.docType === "lettre"
                  ? "On y a repéré des formules de lettre de motivation (« Madame, Monsieur », « Cordialement »…) et pas assez de rubriques de CV."
                  : "On n'y a pas trouvé assez de rubriques typiques d'un CV (Expérience, Formation, Compétences, Langues, Profil…) ni de dates de parcours."}{" "}
                Un score ATS n&apos;aurait aucun sens ici, donc on ne l&apos;affiche pas.
              </p>
              <p className="text-xs text-foreground/80 mb-4">
                Rubriques de CV reconnues :{" "}
                <strong>
                  {result.parsed.sectionKinds.length ? result.parsed.sectionKinds.map((k) => SECTION_LABEL.fr[k]).join(", ") : "aucune"}
                </strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetScan}
                  className="flex-1 rounded-2xl bg-brand-600 text-white px-5 py-3 text-sm font-semibold hover:bg-brand-700 transition"
                >
                  Tester un autre fichier
                </button>
                <button
                  onClick={() => setForceShow(true)}
                  className="flex-1 rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:border-foreground/40 transition"
                >
                  C&apos;est bien mon CV, analyser quand même
                </button>
              </div>
            </div>
          )}

          {status === "done" && result && (result.isCv || forceShow) && (
            <div className="text-left rounded-2xl border border-border bg-surface p-6 mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
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
                    <p className="text-sm text-foreground leading-snug">{result.nextTip}</p>
                  </div>
                </div>
              )}

              {result.capReason && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-2xl px-3 py-2 mb-4">
                  Score plafonné : {result.capReason}
                </p>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-5">
                {result.groups.map((g) => (
                  <div key={g.id}>
                    <div className="flex justify-between text-[11px] text-foreground/80 mb-1">
                      <span>{g.label}</span>
                      <span className="tabular-nums">{g.percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${g.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                {result.criteria.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    {c.status === "ok" ? (
                      <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5 text-green-600" />
                    ) : c.status === "partial" ? (
                      <CircleDot size={15} className="flex-shrink-0 mt-0.5 text-amber-600" />
                    ) : (
                      <Circle size={15} className="flex-shrink-0 mt-0.5 text-red-500" />
                    )}
                    <div>
                      <span className="text-foreground">{c.label}</span>
                      <span className="text-foreground/70"> — {c.detail}</span>
                      {c.status !== "ok" && <p className="text-xs text-foreground/80 mt-0.5">{c.tip}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <details className="rounded-2xl border border-border p-4 mb-4 text-sm">
                <summary className="cursor-pointer font-semibold">Ce que l&apos;ATS a lu dans votre CV</summary>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-foreground/70">Nom</dt>
                  <dd>{result.parsed.name || "— non trouvé"}</dd>
                  <dt className="text-foreground/70">Email</dt>
                  <dd>{result.parsed.email || "— non trouvé"}</dd>
                  <dt className="text-foreground/70">Téléphone</dt>
                  <dd>{result.parsed.phone || "— non trouvé"}</dd>
                  <dt className="text-foreground/70">Localisation</dt>
                  <dd>{result.parsed.location || "— non trouvée"}</dd>
                  <dt className="text-foreground/70">Rubriques</dt>
                  <dd>{result.parsed.sectionKinds.map((k) => SECTION_LABEL.fr[k]).join(", ") || "— aucune"}</dd>
                  <dt className="text-foreground/70">Expériences</dt>
                  <dd>{result.parsed.experiences.length}</dd>
                  <dt className="text-foreground/70">Formations</dt>
                  <dd>{result.parsed.educations.length}</dd>
                  <dt className="text-foreground/70">Compétences</dt>
                  <dd>{result.parsed.skills.length}</dd>
                  <dt className="text-foreground/70">Mise en page</dt>
                  <dd>
                    {result.parsed.columns} colonne{result.parsed.columns > 1 ? "s" : ""} · {result.parsed.pageCount} page
                    {result.parsed.pageCount > 1 ? "s" : ""}
                  </dd>
                </dl>
              </details>

              <div className="rounded-2xl border border-border p-4 mb-6">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Target size={15} /> Comparer à une offre d&apos;emploi (facultatif)
                </h2>
                <p className="text-xs text-foreground/80 mt-1 mb-2">
                  Collez l&apos;offre : on vérifie, comme un ATS, quels mots-clés importants de l&apos;offre figurent dans votre CV. Le
                  texte reste dans votre navigateur.
                </p>
                <textarea
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                  rows={4}
                  placeholder="Collez ici le texte de l'offre…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                {result.keywords && result.keywords.keywords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold mb-2">
                      Correspondance : <span className="tabular-nums">{result.keywords.matchPercent}%</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywords.keywords.map((k) => (
                        <span
                          key={k.term}
                          className={`text-xs rounded-full px-2.5 py-1 border ${
                            k.present
                              ? "border-green-600/40 bg-green-600/10 text-foreground"
                              : "border-amber-600/50 bg-amber-500/10 text-foreground"
                          }`}
                        >
                          {k.present ? "✓" : "✗"} {k.term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand-600/40 bg-brand-600/5 p-4 space-y-3">
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Pencil size={15} /> Améliorez ce CV dans l&apos;éditeur
                  </h2>
                  <p className="mt-1 text-xs text-foreground/80 leading-relaxed">
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
                <p className="text-[11px] text-foreground/70">
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
                  onClick={resetScan}
                  className="px-5 py-3 text-sm font-medium border border-border rounded-2xl hover:border-foreground/30 transition"
                >
                  Tester un autre CV
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-foreground/70 mt-6">
            Analyse heuristique locale, à titre indicatif — elle ne reproduit pas un logiciel ATS
            précis mais repère les points que la plupart d&apos;entre eux vérifient.
          </p>
        </div>
      </section>
    </main>
  );
}
