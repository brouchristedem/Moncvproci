// Lecture d'un PDF avec la POSITION de chaque morceau de texte (x, y, taille),
// pas seulement le texte brut. C'est ce dont un vrai ATS a besoin pour
// reconstituer les lignes, repérer les colonnes et l'en-tête de la page.
// Tout se passe dans le navigateur : le fichier n'est envoyé nulle part.

import type { PDFDocumentProxy } from "pdfjs-dist";

export interface LayoutItem {
  str: string;
  x: number; // abscisse du début du texte (points PDF, 0 = bord gauche)
  y: number; // ordonnée de la ligne de base, 0 = HAUT de la page
  w: number; // largeur du texte
  size: number; // corps de la police (points)
}

export interface LayoutPage {
  width: number;
  height: number;
  items: LayoutItem[];
}

export interface PdfLayout {
  pages: LayoutPage[];
}

// Les types de pdf.js (TextItem / TextMarkedContent) ne sont pas exportés de
// façon stable : on lit juste les champs dont on a besoin.
interface RawTextItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
}

export async function layoutFromPdf(pdf: PDFDocumentProxy): Promise<PdfLayout> {
  const pages: LayoutPage[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: LayoutItem[] = [];
    for (const raw of content.items as RawTextItem[]) {
      if (typeof raw.str !== "string" || !raw.str.trim() || !raw.transform) continue;
      const t = raw.transform;
      const size = Math.hypot(t[0], t[1]) || raw.height || 10;
      items.push({
        str: raw.str,
        x: t[4],
        y: viewport.height - t[5],
        w: raw.width || raw.str.length * size * 0.5,
        size,
      });
    }
    pages.push({ width: viewport.width, height: viewport.height, items });
  }
  return { pages };
}

export async function readPdfLayout(file: File): Promise<PdfLayout> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  return layoutFromPdf(pdf);
}
