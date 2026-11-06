"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X, Columns3, Eye, Sparkles, ArrowRight, ShieldCheck, ChevronDown } from "lucide-react";
import { TEMPLATE_LIST, CATEGORIES, TemplateMeta } from "@/lib/templateRegistry";
import { demoCV } from "@/lib/demoCV";
import TemplateThumbnail from "./TemplateThumbnail";

// Une couleur d'accent différente par modèle, pour que la galerie ne donne
// pas l'impression que tous les modèles se ressemblent. Palette volontairement
// variée (bleu, vert, gris, marron, orange, doré, ivoire/blanc, et autres
// teintes) pour montrer l'éventail de styles disponibles.
const PREVIEW_COLORS: Record<string, string> = {
  "template-01": "#1e3a5f", // Classique Élégant — bleu marine
  "template-02": "#0f766e", // Moderne Bicolore — vert émeraude
  "template-03": "#a8a29e", // Minimaliste — ivoire/gris clair
  "template-04": "#1d4ed8", // Corporate — bleu
  "template-05": "#ea580c", // Créatif Accent — orange
  "template-06": "#475569", // Ingénieur Tech — gris ardoise
  "template-07": "#a67c00", // Exécutif Premium — doré
  "template-08": "#78350f", // Compact Data — marron
  "template-09": "#57534e", // Académique — gris chaud
  "template-10": "#0284c7", // Sidebar Clair — bleu ciel
  "template-11": "#16a34a", // Épuré Grille — vert
  "template-12": "#7c2d12", // International — marron/bordeaux
  "template-13": "#f97316", // Startup Dynamique — orange vif
  "template-14": "#4338ca", // Consultant — indigo
  "template-15": "#a21caf", // Photo Focus — fuchsia
};

// Une forme de cadre photo différente par modèle (rond, arrondi, carré), en
// rotation, pour que la galerie montre d'emblée les différentes options de
// recadrage disponibles dans l'éditeur — pas seulement sur un seul modèle.
const PHOTO_SHAPES: Array<"cercle" | "arrondi" | "carre"> = ["cercle", "arrondi", "carre"];

// On fait tourner l'intitulé du bouton d'une carte à l'autre pour que la
// galerie ne paraisse pas répétitive. Toutes les actions mènent au même
// endroit (l'éditeur avec ce modèle pré-sélectionné) : ce n'est qu'une
// variation de formulation, pas de comportement.
const CTA_LABELS = ["Aperçu", "Personnaliser", "Utiliser"];

type ColonneFiltre = "toutes" | 1 | 2;
type CategorieFiltre = "toutes" | TemplateMeta["categorie"];

const MAX_COMPARE = 3;

// Sélection éditoriale (choix de mise en avant, pas une mesure d'usage
// réelle) : un seul modèle marqué "Populaire" pour guider un premier choix.
// À ajuster manuellement si des données d'usage réelles deviennent
// disponibles plus tard.
const POPULAR_ID = "template-02";

// Nombre de vignettes rendues en pleine fidélité (CV complet, mis à l'échelle
// en CSS) dès le chargement de la page. Chaque vignette au-delà de ce nombre
// monte un CVRenderer entier dans le DOM même si elle est scrollée hors champ
// horizontalement — cela alourdit inutilement le poids initial de la page
// d'accueil. Les modèles suivants ne sont montés qu'après un clic explicite
// sur "Voir les autres modèles".
const INITIAL_COUNT = 3;

export default function TemplateGallery({ showCompare = true, showFilters = true }: { showCompare?: boolean; showFilters?: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [colonneFiltre, setColonneFiltre] = useState<ColonneFiltre>("toutes");
  const [categorieFiltre, setCategorieFiltre] = useState<CategorieFiltre>("toutes");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const active = TEMPLATE_LIST.filter((tpl) => tpl.actif);

  const filtered = useMemo(() => {
    return active.filter((tpl) => {
      if (colonneFiltre !== "toutes" && tpl.colonnes !== colonneFiltre) return false;
      if (categorieFiltre !== "toutes" && tpl.categorie !== categorieFiltre) return false;
      return true;
    });
  }, [active, colonneFiltre, categorieFiltre]);

  // Si l'utilisateur change de filtre, on repart sur un affichage réduit :
  // sinon, changer de filtre après avoir cliqué "Voir plus" une fois
  // afficherait d'emblée tous les modèles du nouveau filtre, sans l'économie
  // de DOM recherchée.
  useEffect(() => {
    setExpanded(false);
  }, [colonneFiltre, categorieFiltre]);

  const visible = expanded ? filtered : filtered.slice(0, INITIAL_COUNT);
  const hiddenCount = filtered.length - visible.length;

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  const compareTemplates = compareIds
    .map((id) => active.find((t) => t.id === id))
    .filter((t): t is (typeof active)[number] => Boolean(t));

  const chipBase = "px-3 py-1.5 rounded-2xl text-xs font-medium border transition whitespace-nowrap";
  const chipActive = "bg-brand-600 text-white border-brand-600";
  const chipInactive = "bg-surface text-foreground/60 border-border hover:border-brand-600/40";

  return (
    <div className="relative">
      {showFilters && (
        <>
          {/* Filtres */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="flex items-center gap-1 text-xs text-foreground/40 mr-1">
              <Columns3 size={13} /> Filtrer :
            </span>
            <button
              onClick={() => setColonneFiltre("toutes")}
              className={`${chipBase} ${colonneFiltre === "toutes" ? chipActive : chipInactive}`}
            >
              Toutes les mises en page
            </button>
            <button
              onClick={() => setColonneFiltre(1)}
              className={`${chipBase} ${colonneFiltre === 1 ? chipActive : chipInactive}`}
            >
              1 colonne
            </button>
            <button
              onClick={() => setColonneFiltre(2)}
              className={`${chipBase} ${colonneFiltre === 2 ? chipActive : chipInactive}`}
            >
              2 colonnes
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="flex items-center gap-1 text-xs text-foreground/40 mr-1">
              <ShieldCheck size={13} /> Style :
            </span>
            <button
              onClick={() => setCategorieFiltre("toutes")}
              className={`${chipBase} ${categorieFiltre === "toutes" ? chipActive : chipInactive}`}
            >
              Tous les styles
            </button>
            {(Object.keys(CATEGORIES) as TemplateMeta["categorie"][]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategorieFiltre(cat)}
                className={`${chipBase} ${categorieFiltre === cat ? chipActive : chipInactive}`}
              >
                {CATEGORIES[cat].label}
              </button>
            ))}
          </div>
          {categorieFiltre !== "toutes" && (
            <p className="text-xs text-foreground/45 -mt-2 mb-4">{CATEGORIES[categorieFiltre].description}</p>
          )}
        </>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs text-foreground/40">
          {filtered.length} modèle{filtered.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Précédent"
            className="p-2 rounded-2xl border border-border hover:border-[#157A52] hover:text-[#157A52] transition"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Suivant"
            className="p-2 rounded-2xl border border-border hover:border-[#157A52] hover:text-[#157A52] transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Toutes les cartes ont la même largeur fixe et la même hauteur
          (vignette au ratio A4 constant, voir TemplateThumbnail) : elles
          s'alignent donc parfaitement sur une seule ligne, sans qu'aucune ne
          paraisse plus grande ou plus coupée qu'une autre. */}
      <div
        ref={scrollerRef}
        className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-px-6 -mx-4 sm:-mx-6 px-4 sm:px-6"
        style={{ scrollbarWidth: "thin" }}
      >
        {visible.map((tpl, i) => {
          const ctaLabel = CTA_LABELS[i % CTA_LABELS.length];
          const isComparing = compareIds.includes(tpl.id);
          return (
            <div
              key={tpl.id}
              className="group shrink-0 w-[190px] sm:w-[220px] snap-start rounded-2xl border border-[#E3F0E9] bg-white overflow-hidden transition-all duration-300 hover:-translate-y-1 relative flex flex-col"
              style={{ boxShadow: "0 4px 16px -8px rgba(12,59,46,0.1)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 16px 32px -12px rgba(12,59,46,0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px -8px rgba(12,59,46,0.1)")}
            >
              <Link href={`/editor?template=${tpl.id}`} className="block pointer-events-none overflow-hidden">
                <div className="transition-transform duration-300 group-hover:scale-[1.04]">
                  <TemplateThumbnail cv={demoCV(tpl.id, PREVIEW_COLORS[tpl.id], PHOTO_SHAPES[i % PHOTO_SHAPES.length])} />
                </div>
              </Link>

              {tpl.categorie === "ats" && (
                <span
                  className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-[#157A52] text-white px-2 py-0.5 text-[9px] font-semibold"
                  title="Mise en page une colonne, structure simple — une bonne base pour les logiciels de tri, sans garantie universelle."
                >
                  <ShieldCheck size={10} /> Structure simple
                </span>
              )}

              {tpl.id === POPULAR_ID && (
                <span
                  className={`absolute top-2 flex items-center gap-1 rounded-full bg-[#F26B1D] text-white px-2 py-0.5 text-[9px] font-semibold ${
                    showCompare ? "left-1/2 -translate-x-1/2" : "right-2"
                  }`}
                >
                  Populaire
                </span>
              )}

              {showCompare && (
                <button
                  type="button"
                  onClick={() => toggleCompare(tpl.id)}
                  disabled={!isComparing && compareIds.length >= MAX_COMPARE}
                  className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border backdrop-blur transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    isComparing
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-surface/90 text-foreground/60 border-border hover:border-brand-600"
                  }`}
                >
                  <Sparkles size={11} /> {isComparing ? "Sélectionné" : "Comparer"}
                </button>
              )}

              <div className="p-3 border-t border-border">
                <p className="font-medium text-sm truncate">{tpl.nom}</p>
                <p className="text-[11px] text-foreground/45 mt-0.5 line-clamp-1">{tpl.style}</p>
                <Link
                  href={`/editor?template=${tpl.id}`}
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#157A52] group-hover:underline"
                >
                  {ctaLabel === "Aperçu" && <Eye size={12} />}
                  {ctaLabel} →
                </Link>
              </div>
            </div>
          );
        })}

        {/* Carte légère (pas de CVRenderer monté) invitant à charger le
            reste des modèles à la demande, plutôt que de rendre les 15 CV
            complets dès le chargement de la page. */}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="group shrink-0 w-[190px] sm:w-[220px] snap-start rounded-2xl border border-dashed border-border bg-surface flex flex-col items-center justify-center gap-2 text-center p-4 hover:border-[#157A52] hover:text-[#157A52] transition"
            style={{ aspectRatio: "210 / 297" }}
          >
            <Sparkles size={20} className="text-foreground/40 group-hover:text-[#157A52] transition" />
            <span className="text-sm font-medium">
              Voir les {hiddenCount} autres modèle{hiddenCount > 1 ? "s" : ""}
            </span>
            <span className="text-[11px] text-foreground/45">Cliquez pour afficher toute la galerie</span>
          </button>
        )}
      </div>

      {/* Barre de comparaison */}
      {showCompare && compareIds.length > 0 && (
        <div className="sticky bottom-3 sm:bottom-4 z-30 mt-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-foreground text-background pl-4 pr-2 py-2 shadow-lg">
            <span className="text-xs">
              {compareIds.length} modèle{compareIds.length > 1 ? "s" : ""} sélectionné
              {compareIds.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setCompareOpen(true)}
              className="flex items-center gap-1 rounded-2xl bg-[#157A52] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0f5d3e] transition"
            >
              Comparer <ArrowRight size={12} />
            </button>
            <button
              onClick={() => setCompareIds([])}
              aria-label="Vider la sélection"
              className="p-1.5 rounded-full hover:bg-background/10 transition"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Panneau de comparaison côte à côte */}
      {compareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6"
          onClick={() => setCompareOpen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl bg-surface border border-border p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg">Comparer les modèles</h3>
              <button
                onClick={() => setCompareOpen(false)}
                aria-label="Fermer"
                className="p-2 rounded-2xl hover:bg-surface-muted transition"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.max(compareTemplates.length, 1)}, minmax(0, 1fr))` }}
            >
              {compareTemplates.map((tpl, i) => (
                <div key={tpl.id} className="rounded-2xl border border-border overflow-hidden">
                  <div className="pointer-events-none">
                    <TemplateThumbnail cv={demoCV(tpl.id, PREVIEW_COLORS[tpl.id], PHOTO_SHAPES[i % PHOTO_SHAPES.length])} />
                  </div>
                  <div className="p-3 border-t border-border">
                    <p className="font-medium text-sm">{tpl.nom}</p>
                    <p className="text-[11px] text-foreground/45 mt-0.5">{tpl.style}</p>
                    <Link
                      href={`/editor?template=${tpl.id}`}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-600 hover:underline"
                    >
                      Utiliser ce modèle <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
