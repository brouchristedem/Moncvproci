"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Réponses vérifiées sur le fonctionnement réel du produit (voir DownloadPanel.tsx
// / AuthContext.tsx) plutôt que des réponses génériques. Point important :
// incrementDownloads() remet paidUnlocked à false juste après le téléchargement
// (voir AuthContext.tsx) — chaque téléchargement est donc un paiement séparé,
// que ce soit pour retélécharger le même CV ou après une modification. Il n'y a
// pas d'accès illimité après un seul paiement. Un compte gère un CV à la fois
// (pas de multi-CV pour l'instant), mais la modification dans l'éditeur reste
// gratuite — seul l'export PDF est payant, à chaque fois.
const FAQ = [
  {
    q: "Combien coûte le téléchargement d'un CV ?",
    a: "1 000 FCFA pour le CV seul, ou 1 500 FCFA pour le Pack Candidature Complète (CV + lettre de motivation assortie), à chaque téléchargement. Pas d'abonnement.",
  },
  {
    q: "Comment s'effectue le paiement ?",
    a: "Depuis ton téléphone, via Geniuspay : Wave, Orange Money, MTN, Moov ou carte bancaire. Aucune carte n'est nécessaire. Le paiement n'intervient qu'au moment de télécharger le PDF final, et ton téléchargement se débloque automatiquement une fois le paiement confirmé.",
  },
  {
    q: "Puis-je voir mon CV avant de payer ?",
    a: "Oui. Tu crées ton CV et tu vois un aperçu complet (avec un filigrane) avant tout paiement.",
  },
  {
    q: "Puis-je modifier mon CV après le paiement ?",
    a: "Oui, l'éditeur reste accessible. En revanche, chaque téléchargement du PDF est un paiement séparé : pour retélécharger le même CV ou une version modifiée, tu repaies 1 000 FCFA (ou 1 500 FCFA pour le Pack).",
  },
  {
    q: "Comment mes données sont-elles protégées ?",
    a: "Tes informations ne sont ni vendues ni partagées à des fins commerciales, et servent uniquement à générer ton CV. La seule exception est la fonction IA, facultative : si tu l'utilises, le texte concerné est envoyé à un prestataire d'IA tiers. Tu peux demander la suppression de tes données à tout moment via WhatsApp. Détails dans nos Conditions d'utilisation.",
  },
  {
    q: "Puis-je changer de modèle en cours de route ?",
    a: "Oui, à tout moment dans l'éditeur : vos informations restent, seule la mise en page change.",
  },
  {
    q: "Mes modèles sont-ils compatibles avec les logiciels de tri (ATS) ?",
    a: "Les modèles classés \"Structure simple\" (une colonne, mise en page sobre) suivent les recommandations générales pour rester lisibles par ces logiciels. Les modèles à deux colonnes sont plus visuels, mais peuvent être moins bien interprétés selon le logiciel du recruteur. Il n'existe pas de garantie universelle : chaque ATS fonctionne différemment.",
  },
  {
    q: "Puis-je créer plusieurs CV avec un seul compte ?",
    a: "Pour l'instant, un compte gère un CV à la fois : vous pouvez le modifier librement, mais pas garder plusieurs versions séparées en parallèle.",
  },
  {
    q: "Comment obtenir une lettre de motivation ?",
    a: "En activant le Pack Candidature Complète dans l'éditeur : votre CV et une lettre de motivation au même style, dans un seul PDF, pour 1 500 FCFA.",
  },
  {
    q: "Puis-je importer mon ancien CV ?",
    a: "Oui, si vous êtes connecté : à l'étape « Infos » de l'éditeur, choisissez votre CV au format PDF (exporté depuis Word ou Google Docs, pas un scan). Les rubriques se remplissent, puis vous relisez et corrigez. Votre email et votre téléphone ne sont pas envoyés à l'IA.",
  },
  {
    q: "Y a-t-il une aide par intelligence artificielle ?",
    a: "Oui, de façon facultative, avec une limite quotidienne. Un bouton « Améliorer avec l'IA » reformule une description ou une lettre de motivation, sans inventer de faits. Relisez toujours le résultat : l'IA peut se tromper.",
  },
];

export default function FAQSection({ pick }: { pick?: number[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const items = pick ? pick.map((i) => FAQ[i]) : FAQ;

  return (
    <div className="max-w-2xl mx-auto divide-y" style={{ borderColor: "#E3F0E9" }}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={item.q} className="border-t first:border-t-0" style={{ borderColor: "#E3F0E9" }}>
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center gap-4 py-4 text-center relative"
              aria-expanded={isOpen}
            >
              <span className="flex-1 text-sm font-medium" style={{ color: "#1A2E28" }}>{item.q}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                style={{ color: "#157A52" }}
              />
            </button>
            {isOpen && (
              <p
                className="pb-4 text-sm mx-auto text-center"
                style={{ maxWidth: "42ch", lineHeight: 1.7, color: "#1A2E2899" }}
              >
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
