"use client";

import { useEffect, useRef, useState } from "react";

// 297mm à 96dpi (référentiel déjà utilisé par useFitScale pour la largeur 210mm/794px)
const PAGE_HEIGHT_PX = 1122.5;
// On ne descend pas en dessous de cette échelle pour garder un CV lisible :
// au-delà, mieux vaut que la personne retire du contenu plutôt que d'avoir
// un texte illisible une fois imprimé.
const MIN_COMPACT_SCALE = 0.55;
// Marge de sécurité : on vise légèrement moins qu'une page pleine. Un calcul
// pile-poil exact suffit rarement en pratique — l'arrondi au pixel près entre
// le rendu écran et le moteur d'impression du navigateur (ou une police qui
// finit de se charger juste après la mesure) peut faire déborder de quelques
// pixels un CV "tout juste ajusté", et le faire basculer sur une deuxième
// page presque vide. Viser 98,5% de la hauteur absorbe cet écart.
const SAFETY_MARGIN = 0.985;
// Nombre maximum de passes de correction. Le conteneur de mesure est
// désormais rendu à l'échelle candidate elle-même (pas seulement à
// baseZoom), donc chaque passe mesure la hauteur *réellement* obtenue après
// réduction plutôt que de l'extrapoler par une simple règle de trois — ce qui
// corrige les cas où la mise à l'échelle CSS n'est pas parfaitement linéaire
// (bordures, images, arrondis de layout).
const MAX_PASSES = 5;
const CONVERGENCE_THRESHOLD = 0.004;

/**
 * Quand `enabled` est vrai, mesure la hauteur réelle du contenu rendu dans
 * `measureRef` et calcule le facteur à appliquer pour que le CV tienne sur
 * une seule page A4. Se recalcule à chaque changement de contenu (via
 * `watch`), et affine sa mesure sur plusieurs passes en se basant sur le
 * rendu réel à l'échelle candidate plutôt qu'une simple extrapolation.
 */
export function useCompactFit(enabled: boolean, baseZoom: number, watch: string) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [compactScale, setCompactScale] = useState(1);
  // Vrai quand, même à l'échelle minimale, le contenu dépasse encore une
  // page : l'appelant doit alors laisser le CV déborder sur une 2e page
  // plutôt que de couper silencieusement la fin.
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCompactScale(1);
      return;
    }

    let cancelled = false;
    let frameId: number;

    const measure = (pass: number, currentScale: number) => {
      // Double frame : laisse le DOM se poser (police, layout, application
      // du nouveau zoom) avant de lire la hauteur, plutôt qu'une seule frame
      // qui peut capturer un état intermédiaire du rendu.
      frameId = requestAnimationFrame(() => {
        frameId = requestAnimationFrame(() => {
          if (cancelled) return;
          const el = measureRef.current;
          if (!el) return;

          // Le conteneur de mesure n'utilise PAS `zoom` : il est mis en page à la
          // largeur « page / échelle » (comme la zone d'impression, qui réduit
          // par transform), sa hauteur locale est donc multipliée par l'échelle
          // candidate pour obtenir la hauteur réellement imprimée. (`zoom` +
          // largeur en % se comporte différemment selon les versions de Chrome
          // et faisait mesurer une page trop large, donc trop courte.)
          const naturalHeight = el.getBoundingClientRect().height * baseZoom * currentScale;
          const target = PAGE_HEIGHT_PX * SAFETY_MARGIN;

          if (naturalHeight <= target) {
            // Ça tient déjà confortablement à cette échelle : on peut même
            // remonter vers 1 si on avait sur-réduit lors d'une passe
            // précédente (contenu mesuré plus court que prévu une fois
            // effectivement rendu à cette taille).
            if (currentScale < 1) {
              const grownFactor = Math.min(1, currentScale / (naturalHeight / target));
              if (grownFactor - currentScale > CONVERGENCE_THRESHOLD && pass < MAX_PASSES) {
                setCompactScale(grownFactor);
                measure(pass + 1, grownFactor);
                return;
              }
            }
            setCompactScale(currentScale);
            setTooLong(false);
            return;
          }

          // Le contenu, rendu à `currentScale`, dépasse encore la page :
          // on réduit proportionnellement à partir de ce point de mesure réel.
          const factor = target / naturalHeight;
          const nextScale = Math.max(MIN_COMPACT_SCALE, currentScale * factor);
          setCompactScale(nextScale);

          // À l'échelle minimale et toujours trop long : on ne peut plus
          // réduire, le contenu doit continuer sur une 2e page.
          if (currentScale <= MIN_COMPACT_SCALE + 1e-6) {
            setTooLong(true);
            return;
          }

          const improving = Math.abs(nextScale - currentScale) > CONVERGENCE_THRESHOLD;
          if (pass < MAX_PASSES && (improving || nextScale <= MIN_COMPACT_SCALE + 1e-6)) {
            measure(pass + 1, nextScale);
          }
        });
      });
    };

    // Première passe : on repart de l'échelle pleine pour re-mesurer le
    // contenu actuel (il a pu changer depuis la dernière mesure).
    setCompactScale(1);
    measure(0, 1);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, baseZoom, watch]);

  return { measureRef, compactScale, tooLong: enabled && tooLong };
}
