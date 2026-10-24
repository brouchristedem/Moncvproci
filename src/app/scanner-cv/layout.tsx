import type { Metadata } from "next";

// page.tsx est un composant client : il ne peut pas exporter `metadata`.
// Ce layout serveur porte donc le SEO de /scanner-cv.
const title = "Scanner CV gratuit : testez la compatibilité ATS de votre CV";
const description =
  "Analysez gratuitement votre CV en PDF et découvrez s'il est lisible par les logiciels de recrutement (ATS). Sans compte, analyse 100 % dans votre navigateur.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "scanner CV",
    "scanner CV gratuit",
    "analyse de CV",
    "analyser mon CV",
    "tester mon CV",
    "CV compatible ATS",
    "score ATS",
    "vérifier mon CV",
    "améliorer mon CV",
    "CV Côte d'Ivoire",
    "MON CV PRO CI",
  ],
  alternates: {
    canonical: "/scanner-cv",
  },
  openGraph: {
    type: "website",
    url: "/scanner-cv",
    title,
    description,
  },
};

export default function ScannerCvLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
