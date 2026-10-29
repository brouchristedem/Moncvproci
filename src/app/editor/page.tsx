"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useAuth, saveGuestDraft } from "@/lib/AuthContext";
import { useCVStore, mergeWithDefaults } from "@/lib/store";
import CVPreviewFit from "@/components/templates/CVPreviewFit";
import PersonalInfoForm from "@/components/editor/PersonalInfoForm";
import CvImport from "@/components/editor/CvImport";
import AiImproveAll from "@/components/editor/AiImproveAll";
import SectionPanel from "@/components/editor/SectionPanel";
import TemplatePicker from "@/components/editor/TemplatePicker";
import ColorPicker from "@/components/editor/ColorPicker";
import DownloadPanel from "@/components/editor/DownloadPanel";
import CompletenessScore from "@/components/editor/CompletenessScore";
import ATSScore from "@/components/editor/ATSScore";
import { useTheme } from "@/lib/ThemeContext";
import { SECTION_LABELS_FR, SECTION_LABELS_EN, Section, SectionType, PersonalInfo } from "@/lib/types";
import { UI } from "@/lib/i18n";
import {
  Undo2,
  Redo2,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  Download,
  Plus,
  Check,
  Minus,
  Maximize2,
  X,
  Palette,
  FileDown,
  FileUp,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ENTRY_GATE_KEY } from "@/lib/entryGate";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const ALL_TYPES: SectionType[] = [
  "profil",
  "experience",
  "formation",
  "competences",
  "langues",
  "certifications",
  "projets",
  "interets",
  "references",
];

const QUICK_COLORS = ["#2563eb", "#0891b2", "#059669", "#dc2626", "#7c3aed", "#0f172a"];

type Status = "empty" | "partial" | "done";

function sectionStatus(section: Section): Status {
  if (section.items.length === 0) return "empty";
  const filled = section.items.filter((it) => (it.titre || "").trim().length > 0).length;
  if (filled === 0) return "empty";
  return filled === section.items.length ? "done" : "partial";
}

function infosStatus(p: PersonalInfo): Status {
  const fields = [p.prenom, p.nom, p.titre, p.email, p.telephone];
  const filled = fields.filter((v) => (v || "").trim().length > 0).length;
  if (filled === 0) return "empty";
  return filled === fields.length ? "done" : "partial";
}

function StatusDot({ status }: { status: Status }) {
  if (status === "done") return <Check size={13} className="text-green-500 flex-shrink-0" />;
  if (status === "partial")
    return <span className="w-3 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-foreground/25 flex-shrink-0" />;
}

function NavButton({
  label,
  status,
  active,
  onClick,
}: {
  label: string;
  status?: Status;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 flex-shrink-0 lg:w-full text-left px-3 py-2 rounded-2xl text-xs font-medium whitespace-nowrap transition ${
        active
          ? "bg-brand-600 text-white"
          : "bg-surface-muted lg:bg-transparent text-foreground/70 hover:bg-surface-muted"
      }`}
    >
      <span className="flex-1 truncate">{label}</span>
      {status && <StatusDot status={status} />}
    </button>
  );
}

export default function EditorPage() {
  const { user, loading, isAdmin, signOut, saveProgress, loadError, dataLoaded } = useAuth();
  const cv = useCVStore((s) => s.cv);
  const set = useCVStore((s) => s.set);
  const undo = useCVStore((s) => s.undo);
  const redo = useCVStore((s) => s.redo);
  const canUndo = useCVStore((s) => s.canUndo);
  const canRedo = useCVStore((s) => s.canRedo);
  const addSection = useCVStore((s) => s.addSection);
  const { dark, toggle } = useTheme();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = UI[cv.langue];
  const router = useRouter();

  const [saveError, setSaveError] = useState("");
  const reset = useCVStore((s) => s.reset);
  const editingFor = useCVStore((s) => s.editingFor);
  const setEditingFor = useCVStore((s) => s.setEditingFor);
  const [adminSaveMsg, setAdminSaveMsg] = useState("");
  const ownUidRef = useRef<string | null>(null);
  ownUidRef.current = user?.uid ?? null;

  // Admin : ouvre le CV d'un autre compte dans l'éditeur (/editor?cvOf=UID).
  // La sauvegarde automatique est suspendue (editingFor) ; rien n'est écrit
  // sur le compte de la personne tant que l'admin n'appuie pas sur
  // « Enregistrer sur son compte ».
  const adminLoadApplied = useRef(false);
  useEffect(() => {
    if (adminLoadApplied.current || !dataLoaded || !isAdmin) return;
    const uid = new URLSearchParams(window.location.search).get("cvOf");
    adminLoadApplied.current = true;
    if (!uid || uid === ownUidRef.current) return;
    getDoc(doc(db, "users", uid))
      .then((snap) => {
        const data = snap.data();
        if (!data?.cv) return;
        const loaded = mergeWithDefaults(data.cv);
        const name = `${loaded.personalInfo.prenom || ""} ${loaded.personalInfo.nom || ""}`.trim();
        setEditingFor({ uid, label: name || data.email || uid });
        reset(loaded);
      })
      .catch((err) => console.error("Chargement du CV utilisateur:", err));
  }, [dataLoaded, isAdmin, reset, setEditingFor]);

  // Retour au CV de l'admin (quitter la page, ou bouton « Quitter »).
  const restoreOwnCV = async () => {
    const own = ownUidRef.current;
    if (own) {
      try {
        const snap = await getDoc(doc(db, "users", own));
        const data = snap.data();
        reset(data?.cv ? mergeWithDefaults(data.cv) : useCVStore.getState().cv);
      } catch (err) {
        console.error("Restauration du CV admin:", err);
      }
    }
    setEditingFor(null);
  };
  useEffect(() => {
    return () => {
      if (useCVStore.getState().editingFor) void restoreOwnCV();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToTheirAccount = async () => {
    if (!editingFor) return;
    setAdminSaveMsg("Enregistrement…");
    try {
      await setDoc(
        doc(db, "users", editingFor.uid),
        { cv: useCVStore.getState().cv, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setAdminSaveMsg("Enregistré sur son compte ✓");
    } catch (err) {
      console.error(err);
      setAdminSaveMsg("Échec : règles Firestore à republier ?");
    }
  };
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeId, setActiveId] = useState<string>("infos");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  // Filigrane appliqué au portail d'impression pendant un "Aperçu gratuit" :
  // activé juste avant window.print() (déclenché depuis DownloadPanel),
  // désactivé une fois l'impression terminée, pour ne jamais apparaître sur
  // un téléchargement réellement payé.
  const [watermarkPrint, setWatermarkPrint] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  // Empêche d'atterrir directement sur l'éditeur (lien externe, favori, URL
  // tapée à la main) sans être d'abord passé par la page d'accueil — ou par
  // la page de connexion, pour le parcours "télécharger → connexion →
  // éditeur". Voir src/lib/entryGate.ts.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(ENTRY_GATE_KEY) !== "1") {
        router.replace("/");
      }
    } catch {
      // sessionStorage indisponible : on n'empêche pas l'accès.
    }
  }, [router]);

  // Quand l'utilisateur appuie sur "retour" (navigateur ou bouton physique
  // sur mobile) depuis la page d'édition, on le renvoie toujours vers la
  // page d'accueil, quel que soit l'historique de navigation précédent.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      router.replace("/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  // Pré-sélectionne le modèle choisi depuis la galerie de la page d'accueil
  // (lien du type /editor?template=template-04), une seule fois au chargement.
  const templateFromUrlApplied = useRef(false);
  useEffect(() => {
    if (templateFromUrlApplied.current || !dataLoaded) return;
    const tpl = new URLSearchParams(window.location.search).get("template");
    if (tpl) {
      set((c) => ({ ...c, templateId: tpl }));
    }
    templateFromUrlApplied.current = true;
  }, [dataLoaded, set]);

  useEffect(() => {
    if (!user || !dataLoaded || editingFor) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveProgress(cv)
        .then(() => {
          setSaveError("");
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Erreur de sauvegarde:", err);
          setSaveError(err instanceof Error ? err.message : String(err));
        });
    }, 400);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [cv, user, dataLoaded, saveProgress, editingFor]);

  // Sauvegarde immédiate (sans attendre le délai) dès que la page se cache,
  // se ferme, ou passe en arrière-plan — pour ne rien perdre lors d'une
  // actualisation ou d'un changement d'onglet.
  useEffect(() => {
    if (!user || !dataLoaded || editingFor) return;
    const flush = () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveProgress(cv)
        .then(() => setLastSaved(new Date()))
        .catch((err) => console.error("Erreur de sauvegarde:", err));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("focusout", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("focusout", flush);
    };
  }, [cv, user, dataLoaded, saveProgress, editingFor]);

  // Sauvegarde locale (navigateur) de la progression pour les visiteurs qui
  // n'ont pas encore de compte, afin qu'ils ne perdent rien en actualisant
  // la page. Dès qu'ils se connectent, ce brouillon est repris et enregistré
  // sur leur compte (voir AuthContext).
  useEffect(() => {
    if (user || !dataLoaded) return;
    const timeout = setTimeout(() => saveGuestDraft(cv), 400);
    return () => clearTimeout(timeout);
  }, [cv, user, dataLoaded]);

  const orderedSections = useMemo(
    () => [...cv.sections].sort((a, b) => a.ordre - b.ordre),
    [cv.sections]
  );
  const labels = cv.langue === "en" ? SECTION_LABELS_EN : SECTION_LABELS_FR;
  const missingTypes = ALL_TYPES.filter((type) => !cv.sections.some((s) => s.type === type));
  const activeSection = orderedSections.find((s) => s.id === activeId);
  const activeSectionIndex = orderedSections.findIndex((s) => s.id === activeId);

  // Réordonne les rubriques (échange avec la voisine du haut ou du bas),
  // exposé via des flèches dans le panneau de la rubrique ouverte : plus
  // explicite qu'un glisser-déposer sur la petite barre d'onglets du haut,
  // notamment sur mobile.
  const moveSection = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedSections.length) return;
    const newOrder = [...orderedSections];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    newOrder.forEach((s, i) => (s.ordre = i));
    set((c) => ({ ...c, sections: newOrder }));
  };

  // Liste ordonnée de tous les panneaux du formulaire, pour permettre de
  // naviguer avec des boutons "Suivant" / "Précédent" en plus du menu
  // latéral (sinon, sur mobile en particulier, il faut toujours revenir
  // cliquer sur la rubrique voulue dans la barre du haut).
  const panelSteps: { id: string; label: string }[] = [
    { id: "infos", label: t.steps[0] },
    ...orderedSections.map((s) => ({ id: s.id, label: s.titre })),
    { id: "template", label: t.steps[2] },
    { id: "settings", label: t.steps[3] },
  ];
  const currentStepIndex = panelSteps.findIndex((s) => s.id === activeId);
  const prevStep = currentStepIndex > 0 ? panelSteps[currentStepIndex - 1] : null;
  const nextStep =
    currentStepIndex >= 0 && currentStepIndex < panelSteps.length - 1
      ? panelSteps[currentStepIndex + 1]
      : null;

  if (loading || !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-foreground/60">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-3 border-b border-border gap-2">
        <Link href="/" className="font-extrabold text-xs sm:text-sm tracking-wide uppercase flex-shrink-0">
          MON CV PRO CI
        </Link>
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
          <span
            className={`hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${
              user && lastSaved
                ? "bg-green-500/10 text-green-600"
                : "bg-foreground/5 text-foreground/40"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                user && lastSaved ? "bg-green-500" : "bg-foreground/30"
              }`}
            />
            {user ? (lastSaved ? t.savedBadge : t.savingBadge) : t.localSavedBadge}
          </span>
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded-2xl hover:bg-surface-muted disabled:opacity-30 transition"
            title={t.undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded-2xl hover:bg-surface-muted disabled:opacity-30 transition"
            title={t.redo}
          >
            <Redo2 size={16} />
          </button>
          <select
            value={cv.langue}
            onChange={(e) => {
              const langue = e.target.value as "fr" | "en";
              const newLabels = langue === "en" ? SECTION_LABELS_EN : SECTION_LABELS_FR;
              set((c) => ({
                ...c,
                langue,
                sections: c.sections.map((s) =>
                  s.type === "custom" ? s : { ...s, titre: newLabels[s.type] }
                ),
              }));
            }}
            className="text-xs bg-transparent border border-border rounded-2xl px-1.5 sm:px-2 py-1.5"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
          <button onClick={toggle} className="p-2 rounded-2xl hover:bg-surface-muted transition" title={t.theme}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-2xl bg-surface-muted hover:bg-surface transition" title={t.admin}>
              <ShieldCheck size={14} /> Admin
            </Link>
          )}
          <button
            onClick={() => setDownloadOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            <Download size={14} /> {t.steps[4]}
          </button>
          {user ? (
            <button
              onClick={() => signOut().catch((err) => console.error(err))}
              className="p-2 rounded-2xl hover:bg-surface-muted transition"
              title={t.logout}
            >
              <LogOut size={16} />
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs font-medium px-3 py-2 rounded-2xl bg-surface-muted hover:bg-surface transition"
            >
              {cv.langue === "en" ? "Log in" : "Se connecter"}
            </Link>
          )}
        </div>
      </header>

      {editingFor && (
        <div className="px-3 sm:px-4 lg:px-6 py-2 bg-amber-100 text-amber-900 text-xs flex flex-wrap items-center gap-2">
          <span className="flex-1 min-w-0">
            Vous modifiez le CV de <strong>{editingFor.label}</strong>. Rien n&apos;est enregistré sur son compte tant que vous n&apos;appuyez pas sur « Enregistrer ».
            {adminSaveMsg && <em className="ml-2">{adminSaveMsg}</em>}
          </span>
          <button
            onClick={saveToTheirAccount}
            className="px-3 py-1.5 rounded-2xl bg-brand-600 text-white font-semibold"
          >
            Enregistrer sur son compte
          </button>
          <button
            onClick={() => {
              void restoreOwnCV().then(() => router.push("/admin"));
            }}
            className="px-3 py-1.5 rounded-2xl border border-amber-900/30 font-semibold"
          >
            Quitter
          </button>
        </div>
      )}

      {currentStepIndex >= 0 && (
        <div className="px-4 lg:px-6 py-2 border-b border-border flex items-center gap-3">
          <span className="text-[11px] font-medium text-foreground/50 flex-shrink-0">
            {cv.langue === "en" ? "Step" : "Étape"} {currentStepIndex + 1}/{panelSteps.length}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / panelSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {(loadError || saveError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-[11px] text-red-700 break-words">
          {loadError && (
            <p>
              Erreur de chargement de votre profil : {loadError} — votre progression risque de ne
              pas être sauvegardée tant que ceci n&apos;est pas résolu.
            </p>
          )}
          {saveError && <p>Erreur de sauvegarde : {saveError}</p>}
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Sidebar : sections + progression, palette rapide intégrée */}
        <nav className="lg:w-60 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-border flex flex-col overflow-hidden">
          {/* Score de complétude + score ATS : affichés aussi sur mobile
              maintenant (avant, "hidden lg:block" les cachait complètement
              en dessous de 1024px, donc invisibles pour la quasi-totalité
              des utilisateurs qui éditent leur CV depuis un téléphone). */}
          <div className="block divide-y divide-border/60 border-b border-border lg:border-b-0">
            <CompletenessScore />
            <ATSScore />
          </div>
          <div className="relative lg:contents">
            <div className="flex lg:flex-col gap-1.5 p-3 overflow-x-auto lg:overflow-y-auto">
              <NavButton
                label={t.steps[0]}
                status={infosStatus(cv.personalInfo)}
                active={activeId === "infos"}
                onClick={() => setActiveId("infos")}
              />
            {orderedSections.map((section) => (
              <NavButton
                key={section.id}
                label={section.titre}
                status={sectionStatus(section)}
                active={activeId === section.id}
                onClick={() => setActiveId(section.id)}
              />
            ))}
            <div className="relative flex-shrink-0 lg:w-full">
              <button
                onClick={() => setAddMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 flex-shrink-0 lg:w-full text-left px-3 py-2 rounded-2xl text-xs font-medium whitespace-nowrap text-brand-600 border border-dashed border-brand-400 hover:bg-brand-500/10 transition"
              >
                <Plus size={13} /> {cv.langue === "en" ? "Add a section" : "Ajouter une rubrique"}
              </button>
              {addMenuOpen && missingTypes.length >= 0 && (
                <div className="absolute z-20 top-full mt-1.5 left-0 bg-surface border border-border rounded-2xl p-2 shadow-lg flex flex-wrap gap-1.5 w-64">
                  {missingTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        const id = uid();
                        addSection({
                          id,
                          type,
                          titre: labels[type],
                          visible: true,
                          ordre: cv.sections.length,
                          items: [],
                        });
                        setActiveId(id);
                        setAddMenuOpen(false);
                      }}
                      className="text-[11px] px-2 py-1.5 rounded-2xl border border-border hover:bg-surface-muted transition"
                    >
                      + {labels[type]}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const id = uid();
                      addSection({
                        id,
                        type: "custom",
                        titre: cv.langue === "en" ? "New section" : "Nouvelle rubrique",
                        visible: true,
                        ordre: cv.sections.length,
                        items: [],
                      });
                      setActiveId(id);
                      setAddMenuOpen(false);
                    }}
                    className="text-[11px] px-2 py-1.5 rounded-2xl border border-dashed border-brand-400 text-brand-600 hover:bg-brand-500/10 transition"
                  >
                    {t.customSection}
                  </button>
                </div>
              )}
            </div>
            <NavButton
              label={t.steps[2]}
              active={activeId === "template"}
              onClick={() => setActiveId("template")}
            />
            <NavButton
              label={t.steps[3]}
              active={activeId === "settings"}
              onClick={() => setActiveId("settings")}
            />
            </div>
            {/* Indique qu'on peut faire glisser les onglets vers la gauche
                sur mobile : dégradé + flèche, masqués sur desktop où la
                nav est verticale et déjà entièrement visible. */}
            <div className="lg:hidden pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-surface to-transparent flex items-center justify-end pr-1">
              <span className="text-foreground/30 text-xs">›</span>
            </div>
          </div>

          <div className="p-3 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40 mb-2 flex items-center gap-1">
              <Palette size={12} /> {t.personalizeLabel}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => set((c) => ({ ...c, couleurPrimaire: color }))}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    cv.couleurPrimaire === color ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ background: color }}
                  aria-label={color}
                />
              ))}
              <button
                onClick={() => setActiveId("template")}
                className="w-6 h-6 rounded-full border border-dashed border-border flex items-center justify-center text-foreground/40 hover:text-foreground/70 hover:border-foreground/40 transition"
                title={t.steps[2]}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </nav>

        {/* Panneau central : formulaire de la section sélectionnée. Hauteur
            plafonnée sur mobile (avec défilement interne) pour que
            l'ajout d'un élément en bas de liste ne fasse pas défiler toute
            la page (nav + aperçu compris) : seul ce panneau bouge. */}
        <section className="lg:w-[420px] flex-shrink-0 p-4 pb-20 lg:pb-6 lg:p-6 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto max-h-[65vh] lg:max-h-none">
          {activeId === "infos" && (
            <>
              <CvImport />
              <AiImproveAll />
              <PersonalInfoForm />
            </>
          )}

          {activeSection && (
            <SectionPanel
              section={activeSection}
              isFirst={activeSectionIndex === 0}
              isLast={activeSectionIndex === orderedSections.length - 1}
              onMoveUp={() => moveSection(activeSectionIndex, -1)}
              onMoveDown={() => moveSection(activeSectionIndex, 1)}
            />
          )}

          {activeId === "template" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">{t.chooseTemplate}</h3>
                <TemplatePicker />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">{t.cvColor}</h3>
                <ColorPicker />
              </div>
            </div>
          )}

          {activeId === "settings" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold mb-2">{t.textSize}</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={24}
                    value={cv.tailleTexte}
                    onChange={(e) => set((c) => ({ ...c, tailleTexte: Number(e.target.value) }))}
                    className="flex-1"
                  />
                  <select
                    value={cv.tailleTexte}
                    onChange={(e) => set((c) => ({ ...c, tailleTexte: Number(e.target.value) }))}
                    className="text-xs border border-border rounded-2xl px-2 py-1.5 bg-surface"
                  >
                    {[10, 11, 12, 13, 14, 16, 18, 20, 22, 24].map((v) => (
                      <option key={v} value={v}>
                        {v} pt
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {cv.langue === "en" ? "One-page mode" : "Mode compact (une page)"}
                </h3>
                <button
                  onClick={() => set((c) => ({ ...c, modeCompact: !c.modeCompact }))}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-2xl border transition ${
                    cv.modeCompact
                      ? "border-brand-600 bg-brand-600/10 text-brand-600"
                      : "border-border hover:bg-surface-muted"
                  }`}
                >
                  <span>
                    {cv.langue === "en"
                      ? "Automatically shrink to fit on a single page"
                      : "Réduit automatiquement le CV pour tenir sur une seule page"}
                  </span>
                  <span
                    className={`w-9 h-5 rounded-full relative transition flex-shrink-0 ${
                      cv.modeCompact ? "bg-brand-600" : "bg-foreground/20"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                        cv.modeCompact ? "left-4" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t.dateFormatLabel}</h3>
                <div className="flex gap-2">
                  {(["texte", "numerique"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => set((c) => ({ ...c, dateFormat: f }))}
                      className={`px-3 py-2 text-xs rounded-2xl border transition ${
                        cv.dateFormat === f
                          ? "border-brand-600 bg-brand-600/10 text-brand-600"
                          : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      {f === "texte" ? t.dateFormatText : t.dateFormatNumeric}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t.iconStyleLabel}</h3>
                <div className="flex gap-2">
                  {([
                    ["aucune", t.iconNone],
                    ["contour", t.iconOutline],
                    ["remplie", t.iconFilled],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => set((c) => ({ ...c, iconStyle: val }))}
                      className={`px-3 py-2 text-xs rounded-2xl border transition ${
                        cv.iconStyle === val
                          ? "border-brand-600 bg-brand-600/10 text-brand-600"
                          : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">{t.nameOrderLabel}</h3>
                <div className="flex gap-2">
                  {([
                    ["prenom-nom", t.nameOrderFirstLast],
                    ["nom-prenom", t.nameOrderLastFirst],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => set((c) => ({ ...c, ordreNom: val }))}
                      className={`px-3 py-2 text-xs rounded-2xl border transition ${
                        cv.ordreNom === val
                          ? "border-brand-600 bg-brand-600/10 text-brand-600"
                          : "border-border hover:bg-surface-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <h3 className="text-sm font-semibold mb-1 mt-3">{t.dataGroup}</h3>
                <p className="text-[11px] text-foreground/50 mb-2">{t.dataGroupHint}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(cv, null, 2)], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      const fileName = [cv.personalInfo.prenom, cv.personalInfo.nom]
                        .filter(Boolean)
                        .join("-")
                        .toLowerCase()
                        .replace(/[^a-z0-9-]+/g, "-") || "mon-cv";
                      a.href = url;
                      a.download = `${fileName}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-2xl border border-border hover:bg-surface-muted transition"
                  >
                    <FileDown size={14} /> {t.exportJson}
                  </button>
                  <label className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-2xl border border-border hover:bg-surface-muted transition cursor-pointer">
                    <FileUp size={14} /> {t.importJson}
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const parsed = JSON.parse(reader.result as string);
                            if (!parsed || typeof parsed !== "object" || !parsed.personalInfo) {
                              throw new Error("format invalide");
                            }
                            set(() => mergeWithDefaults(parsed));
                            setImportMessage(t.importJsonSuccess);
                          } catch {
                            setImportMessage(t.importJsonError);
                          } finally {
                            window.setTimeout(() => setImportMessage(""), 4000);
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
                {importMessage && (
                  <p
                    className={`text-[11px] mt-2 ${
                      importMessage === t.importJsonSuccess ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {importMessage}
                  </p>
                )}
              </div>

            </div>
          )}

          {/* Navigation Précédent / Suivant : permet d'avancer dans toutes
              les rubriques sans avoir à recliquer dans le menu du haut. */}
          <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-border">
            <button
              onClick={() => prevStep && setActiveId(prevStep.id)}
              disabled={!prevStep}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-2xl border border-border hover:bg-surface-muted transition disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ← {t.previous}
            </button>
            <button
              onClick={() => nextStep && setActiveId(nextStep.id)}
              disabled={!nextStep}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 transition disabled:opacity-30 disabled:hover:bg-brand-600"
            >
              {t.next} →
            </button>
          </div>
        </section>

        {/* Aperçu, avec contrôles de zoom et plein écran */}
        <section className="flex-1 flex flex-col p-4 lg:p-6 lg:overflow-y-auto bg-surface-muted">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-foreground/50">{t.preview} · A4</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
                className="p-1.5 rounded-2xl border border-border hover:bg-surface transition"
                title={t.zoomLabel}
              >
                <Minus size={14} />
              </button>
              <span className="text-[11px] w-10 text-center tabular-nums text-foreground/60">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
                className="p-1.5 rounded-2xl border border-border hover:bg-surface transition"
                title={t.zoomLabel}
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => setFullscreen(true)}
                className="p-1.5 rounded-2xl border border-border hover:bg-surface transition"
                title={t.fullscreenLabel}
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>
          <div className="w-full max-w-[210mm] mx-auto">
            <CVPreviewFit cv={cv} printMode zoom={zoom} watermark={watermarkPrint} />
          </div>
        </section>
      </main>

      {!fullscreen && !downloadOpen && (
        <button
          onClick={() => setFullscreen(true)}
          className="lg:hidden fixed bottom-24 right-5 z-40 flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-full bg-foreground text-background shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-transform print:hidden"
        >
          <Eye size={16} />
          <span className="text-xs font-semibold">
            {cv.langue === "en" ? "Preview" : "Aperçu"}
          </span>
        </button>
      )}

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col p-4">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setFullscreen(false)}
              className="text-white p-2 rounded-2xl hover:bg-white/10 transition"
              title={t.closeLabel}
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center">
            <div className="w-full max-w-[210mm]">
              <CVPreviewFit cv={cv} zoom={1} />
            </div>
          </div>
        </div>
      )}

      {downloadOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setDownloadOpen(false)}
        >
          <div
            className="bg-surface rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">{t.steps[4]}</h2>
              <button
                onClick={() => setDownloadOpen(false)}
                className="p-1 hover:bg-surface-muted rounded-2xl"
              >
                <X size={16} />
              </button>
            </div>
            <DownloadPanel setWatermarkPrint={setWatermarkPrint} />
          </div>
        </div>
      )}
    </div>
  );
}
