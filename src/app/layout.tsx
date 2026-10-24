import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { Analytics } from "@vercel/analytics/next";
import WhatsAppButton from "@/components/WhatsAppButton";
import PwaInstall from "@/components/PwaInstall";

const siteUrl = "https://moncvproci.com";
const title = "MON CV PRO CI — Créer un CV professionnel en ligne en Côte d'Ivoire";
const description =
  "Créez votre CV professionnel en ligne en Côte d'Ivoire : 15 modèles compatibles ATS, éditeur gratuit, lettre de motivation assortie, export PDF, paiement par Wave.";

// Explicite plutôt que de laisser Next.js déduire un viewport par défaut :
// certaines versions de Safari iPad appliquent un zoom/scaling incohérent
// sans cette déclaration, ce qui peut faire disparaître ou mal positionner
// des blocs de la page d'accueil.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#157A52",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | MON CV PRO CI",
  },
  description,
  keywords: [
    // Cœur de recherche
    "créer un CV",
    "créer un CV en ligne",
    "faire un CV",
    "faire un CV en ligne",
    "CV en ligne",
    "CV professionnel",
    "CV moderne",
    "CV PDF",
    "faire un CV PDF",
    "générateur de CV",
    "créateur de CV",
    "logiciel de CV",
    "site pour faire un CV",
    "modèle de CV",
    "modèle de CV gratuit",
    "exemple de CV",
    "CV gratuit",
    // Local : Côte d'Ivoire / Afrique de l'Ouest
    "CV Côte d'Ivoire",
    "CV Abidjan",
    "faire un CV Côte d'Ivoire",
    "faire un CV à Abidjan",
    "modèle de CV Côte d'Ivoire",
    "CV Afrique",
    "CV Afrique de l'Ouest",
    "emploi Côte d'Ivoire",
    "recherche d'emploi Abidjan",
    "candidature Côte d'Ivoire",
    // Usage
    "CV pour stage",
    "CV étudiant",
    "CV premier emploi",
    "CV sans expérience",
    "CV compatible ATS",
    "CV ATS",
    "CV format international",
    // Lettre de motivation
    "lettre de motivation",
    "lettre de motivation Côte d'Ivoire",
    "lettre de motivation stage",
    "lettre de motivation en ligne",
    // Marque
    "MON CV PRO CI",
    "moncvproci",
    "mon cv pro",
  ],
  authors: [{ name: "MON CV PRO CI" }],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  verification: {
    google: "68js8ybAz8O2xwX0C_T1dnZQ3_wlD9yBbVbKNDw9QM4",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MON CV PRO CI",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl,
    siteName: "MON CV PRO CI",
    title,
    description,
    images: [
      {
        url: "/og-image-v6.png",
        width: 1200,
        height: 630,
        alt: "MON CV PRO CI — Créez un CV professionnel en quelques minutes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image-v6.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "MON CV PRO CI",
              url: siteUrl,
              logo: `${siteUrl}/icons/icon-512.png`,
              image: `${siteUrl}/icons/icon-512.png`,
              description,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              areaServed: [
                { "@type": "Country", name: "Côte d'Ivoire" },
                { "@type": "Place", name: "Afrique de l'Ouest" },
              ],
              keywords:
                "créer un CV, CV en ligne, CV professionnel, modèle de CV, CV Côte d'Ivoire, CV Abidjan, lettre de motivation, CV compatible ATS",
              offers: [
                {
                  "@type": "Offer",
                  name: "CV seul",
                  priceCurrency: "XOF",
                  price: "1000",
                },
                {
                  "@type": "Offer",
                  name: "Pack Candidature Complète (CV + lettre de motivation)",
                  priceCurrency: "XOF",
                  price: "1500",
                },
              ],
              inLanguage: ["fr", "en"],
            }),
          }}
        />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <WhatsAppButton />
        <PwaInstall />
        <Analytics />
      </body>
    </html>
  );
}
