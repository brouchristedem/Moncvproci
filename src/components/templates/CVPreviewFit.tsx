"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CVData } from "@/lib/types";
import CVRenderer from "./CVRenderer";
import LettreRenderer from "./LettreRenderer";
import { useFitScale } from "@/lib/useFitScale";
import { useCompactFit } from "@/lib/useCompactFit";
import { maskCvForPreview } from "@/lib/previewMask";

const PAGE_HEIGHT_RATIO = 297 / 210;

export default function CVPreviewFit({
  cv,
  printMode = false,
  zoom = 1,
  watermark = false,
}: {
  cv: CVData;
  printMode?: boolean;
  zoom?: number;
  watermark?: boolean;
}) {
  const { containerRef, scale, contentWidth } = useFitScale(zoom);
  const scaledHeight = contentWidth * PAGE_HEIGHT_RATIO * scale;
  const scaledWidth = contentWidth * scale;
  const [mounted, setMounted] = useState(false);
  // iOS (Safari, Chrome iOS, etc. — tous sur WebKit) : voir la note dans la
  // zone d'impression plus bas.
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    setMounted(true);
    const ua = navigator.userAgent || "";
    setIsIOS(
      /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);

  const baseZoom = cv.tailleTexte / 13;
  // Une clé simple qui change dès que quelque chose susceptible d'affecter la
  // hauteur du CV change, pour redéclencher la mesure du mode compact (sans
  // dépendre d'une sérialisation complète et coûteuse de tout l'objet cv à
  // chaque frappe). Doit couvrir tout ce qui influe visuellement sur la
  // hauteur : infos personnelles (en-tête), mode d'affichage des rubriques
  // (ligne vs liste change radicalement la hauteur), et chaque champ texte
  // d'un item, pas seulement titre/description.
  const p = cv.personalInfo;
  const personalKey = `${p.showPhoto ? p.photoShape : "x"}|${p.prenom.length}|${p.nom.length}|${p.titre.length}|${p.email.length}|${p.telephone.length}|${p.adresse.length}|${(p.permis || "").length}|${(p.linkedin || "").length}|${(p.siteWeb || "").length}|${p.autresInfos.map((i) => i.label.length + i.valeur.length).join(",")}`;
  const watchKey = `${cv.templateId}|${cv.tailleTexte}|${cv.dateFormat}|${cv.iconStyle}|${cv.ordreNom}|${personalKey}|${cv.sections
    .map(
      (s) =>
        `${s.id}:${s.visible}:${s.affichage || ""}:${s.items.length}:${s.items
          .map(
            (i) =>
              (i.titre || "").length +
              (i.sousTitre || "").length +
              (i.lieu || "").length +
              (i.dateDebut || "").length +
              (i.dateFin || "").length +
              (i.niveau || "").length +
              (i.description || "").length
          )
          .join(",")}`
    )
    .join("|")}`;
  const { measureRef, compactScale } = useCompactFit(!!cv.modeCompact, baseZoom, watchKey);
  const finalZoom = baseZoom * compactScale;

  // Version masquée du CV, utilisée UNIQUEMENT dans la zone d'impression
  // quand le filigrane "Aperçu gratuit" est actif : coordonnées de contact
  // remplacées par des "•" et une partie du contenu tronquée (voir
  // previewMask.ts). Le filigrane visuel seul est contournable par une IA
  // de retouche d'image ; ce masquage protège la donnée elle-même, avant
  // même qu'elle n'atteigne le DOM imprimé. L'aperçu à l'écran pendant
  // l'édition (plus bas, hors portail d'impression) continue lui d'utiliser
  // `cv` en clair.
  const printCv = watermark ? maskCvForPreview(cv) : cv;

  return (
    <>
      {/* Aperçu visible à l'écran uniquement — ajusté à la largeur disponible.
          Le conteneur mesuré (containerRef) occupe toute la largeur ; la page
          A4 est placée dans une boîte dont la taille est celle de la page
          RÉDUITE (largeur et hauteur après zoom). `transform: scale()` ne
          change pas la taille de mise en page : avant, la page gardait sa
          largeur d'origine (794 px) dans la mise en page, donc elle débordait
          à droite sur téléphone, paraissait décentrée quand le zoom était
          réduit, et était coupée sur les côtés quand le zoom dépassait 100 %.
          Ici la boîte a la bonne taille, est centrée quand elle tient dans
          l'écran, et défile horizontalement (sans rien couper) quand elle est
          plus large que l'écran. */}
      <div ref={containerRef} className="w-full overflow-x-auto print:hidden">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            minWidth: "100%",
            width: "max-content",
          }}
        >
          <div style={{ width: scaledWidth, height: scaledHeight, flexShrink: 0 }}>
            <div
              className="bg-white shadow-xl cv-protected"
              style={{
                width: contentWidth,
                height: contentWidth * PAGE_HEIGHT_RATIO,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Largeur en calc (absolue) pour éviter le CV collé à gauche.
                  Hauteur en pourcentage : ici pas de risque de "page 2" comme à
                  l'impression (pas de pagination à l'écran), mais on garde la
                  même logique que le rendu imprimé pour que les deux versions
                  se comportent de façon cohérente. */}
              <div
                style={{
                  zoom: finalZoom,
                  width: `calc(${contentWidth}px / ${finalZoom})`,
                  height: `${100 / finalZoom}%`,
                }}
              >
                <CVRenderer cv={cv} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mesure invisible hors-écran, rendue à l'échelle actuellement
          candidate (finalZoom), pour savoir si le contenu déborde d'une page
          à cette taille et affiner le facteur de réduction sur plusieurs
          passes si besoin — voir useCompactFit. */}
      {cv.modeCompact && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: -99999,
            width: 794,
            pointerEvents: "none",
          }}
        >
          <div ref={measureRef} style={{ zoom: finalZoom, width: `${100 / finalZoom}%` }}>
            <CVRenderer cv={cv} />
          </div>
        </div>
      )}

      {/* Zone dédiée à l'impression : rendue via un portail directement dans
          <body>, en dehors de l'arborescence de l'application. Le reste de
          l'app (masqué en CSS via visibility) occupait quand même sa place
          dans la page, ce qui forçait Chrome à créer des pages en trop même
          quand le CV visible tenait sur une seule page. En sortant du DOM de
          l'app, seule la vraie hauteur du CV détermine le nombre de pages
          imprimées : 1 page par défaut, plus si le contenu déborde.

          C'est l'impression native du navigateur (window.print()) qui sert
          désormais de méthode de téléchargement, sur tous les navigateurs :
          une tentative précédente générait le PDF côté client (html2canvas)
          en recréant sa propre mise en page en JavaScript plutôt que
          d'utiliser le moteur du navigateur, ce qui produisait de petits
          écarts invisibles à l'écran mais visibles une fois téléchargé
          (icônes légèrement décalées, texte dupliqué de quelques pixels sur
          une coupure de page). L'impression native utilise le même moteur de
          rendu que l'aperçu à l'écran : ce qui est correct à l'écran l'est
          donc aussi une fois téléchargé. */}
      {printMode &&
        mounted &&
        createPortal(
          <div id="cv-print-portal">
            <div
              id="cv-print-area"
              data-scaled={finalZoom < 0.999 ? "true" : "false"}
              style={{
                width: "210mm",
                height: "297mm",
                minHeight: "297mm",
                boxSizing: "border-box",
                position: "relative",
              }}
            >
              {/* La largeur utilise une taille absolue (calc) car il n'y a
                  aucun risque à ça : elle ne peut pas créer une page
                  supplémentaire. La HAUTEUR, elle, revient à un pourcentage
                  (comme avant) : un calc(297mm / zoom) semblait plus robuste
                  en théorie, mais en pratique le zoom peut réduire ce calc
                  à quelques fractions de pixel de moins que 297mm exactement
                  — et comme #cv-print-area a une hauteur FIXE avec overflow
                  visible, ce minuscule écart suffit à faire déborder une
                  page 2 presque vide. Le pourcentage, résolu directement par
                  le moteur de layout plutôt que recalculé à la main, ne
                  provoque pas cet écart. */}
              {/* `zoom` (utilisé partout ailleurs dans ce composant pour
                  l'aperçu écran) n'est pas fiable dans le pipeline
                  d'impression natif d'Android ("Enregistrer au format PDF") :
                  quand finalZoom < 1 (mode compact actif), certains
                  moteurs recalculent mal la largeur en `calc(210mm / zoom)`
                  une fois combinée au zoom, et le CV se retrouve rendu sur
                  une fraction de la largeur de la page au lieu de toute la
                  largeur A4 — bug invisible à l'écran, seulement visible une
                  fois réellement imprimé/exporté depuis certains appareils
                  Android. `transform: scale()` est peint de la même façon
                  visuellement mais n'a pas cette dépendance au calc de
                  largeur : le conteneur externe garde une largeur FIXE de
                  210mm (jamais de calc), et seul le contenu interne est
                  visuellement réduit par transform, avec overflow masqué au
                  cas où la hauteur non réduite du contenu dépasserait
                  ponctuellement la page (le mode compact vise déjà 98,5% de
                  la hauteur d'une page, donc ce cas ne devrait pas arriver
                  en pratique). */}
              <div
                style={{
                  width: "210mm",
                  height: "297mm",
                  overflow: "hidden",
                }}
              >
                {/* iOS (WebKit) : `transform: scale()` ne change pas la
                    mise en page réelle, et WebKit découpe les pages d'après
                    cette mise en page NON réduite (hauteur 297mm / zoom,
                    donc plus d'une page). Résultat observé sur iPhone : un
                    gros vide au milieu de la page 1, et la suite du CV
                    coupée sur une page 2 quasi vide. Sur iOS on utilise donc
                    `zoom` (comme l'aperçu à l'écran, qui s'affiche
                    correctement) : la mise en page réelle fait alors
                    exactement 1 page. Les autres plateformes gardent
                    `transform` (zoom + calc de largeur posait problème sur
                    certains Android). */}
                {isIOS ? (
                  <div
                    style={{
                      zoom: finalZoom,
                      width: `calc(210mm / ${finalZoom})`,
                      height: `calc(297mm / ${finalZoom})`,
                      overflow: "hidden",
                    }}
                  >
                    <CVRenderer cv={printCv} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: `${100 / finalZoom}%`,
                      height: `${100 / finalZoom}%`,
                      transform: `scale(${finalZoom})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <CVRenderer cv={printCv} />
                  </div>
                )}
              </div>

              {/* Filigrane de sécurité pour l'aperçu gratuit ("Test Gratuit"
                  avant paiement). Rendu par-dessus le CV, texte répété en
                  diagonale. N'est présent que lorsque le téléchargement n'a
                  pas encore été payé — voir DownloadPanel.

                  140 répétitions (pas 48) : la zone du filigrane est
                  volontairement surdimensionnée (inset -60mm/-40mm) pour
                  qu'après la rotation -32deg elle couvre bien les coins de
                  la page. Mais `align-content: flex-start` empile les
                  lignes en haut de cette zone — avec trop peu de
                  répétitions, elles ne remplissent qu'une partie de la
                  hauteur réelle et laissent le bas de la page sans
                  filigrane. 140 couvre la zone (~417mm de haut) même sur
                  un CV très court. */}
              {watermark && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "210mm",
                    height: "297mm",
                    overflow: "hidden",
                  }}
                  aria-hidden
                >
                  <div className="cv-watermark-overlay">
                    {Array.from({ length: 140 }).map((_, i) => (
                      <span key={i} className="cv-watermark-text">
                        MON CV PRO CI — APERÇU
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Deuxième page : lettre de motivation, uniquement si elle a été
                activée (Pack "Candidature Complète"). break-before: page
                force le saut de page à l'impression, indépendamment du
                nombre de pages qu'occupe déjà le CV. */}
            {cv.lettreMotivation?.activee && (
              <div
                id="cv-print-area-lettre"
                style={{
                  width: "210mm",
                  height: "297mm",
                  minHeight: "297mm",
                  boxSizing: "border-box",
                  position: "relative",
                  breakBefore: "page",
                }}
              >
                <LettreRenderer cv={printCv} />

                {watermark && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "210mm",
                      height: "297mm",
                      overflow: "hidden",
                    }}
                    aria-hidden
                  >
                    <div className="cv-watermark-overlay">
                      {Array.from({ length: 140 }).map((_, i) => (
                        <span key={`l-${i}`} className="cv-watermark-text">
                          MON CV PRO CI — APERÇU
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
