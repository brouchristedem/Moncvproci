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
    q: "Est-ce vraiment gratuit ?",
    a: "Oui. Vous pouvez créer votre CV et voir un aperçu complet (avec un filigrane) sans rien payer. Le paiement n'intervient qu'au moment de télécharger le PDF final.",
  },
  {
    q: "Combien coûte le téléchargement ?",
    a: "1 000 FCFA pour le CV seul, ou 1 500 FCFA pour le Pack Candidature Complète (CV + lettre de motivation assortie), à chaque téléchargement.",
  },
  {
    q: "Comment payer ?",
    a: "Par Wave, directement depuis votre téléphone. Aucune carte bancaire n'est nécessaire.",
  },
  {
    q: "Puis-je changer de modèle en cours de route ?",
    a: "Oui, à tout moment dans l'éditeur : vos informations restent, seule la mise en page change. C'est gratuit tant que vous ne téléchargez pas le PDF.",
  },
  {
    q: "Puis-je modifier mon CV après l'avoir téléchargé ?",
    a: "Oui, l'éditeur reste accessible et la modification en elle-même est gratuite. En revanche, chaque téléchargement du PDF est un paiement séparé : que ce soit pour retélécharger le même CV ou pour récupérer une version modifiée, il faut repayer 1 000 FCFA (ou 1 500 FCFA pour le Pack) à chaque fois.",
  },
  {
    q: "Mes modèles sont-ils compatibles avec les logiciels de tri (ATS) ?",
    a: "Les modèles classés \"Structure simple\" (une colonne, mise en page sobre) suivent les recommandations générales pour rester lisibles par ces logiciels. Les modèles à deux colonnes sont plus visuels, mais peuvent être moins bien interprétés selon le logiciel utilisé par le recruteur — il n'existe pas de garantie universelle, chaque ATS fonctionne différemment. Un score de compatibilité vous guide dans l'éditeur, quel que soit le modèle choisi.",
  },
  {
    q: "Puis-je créer plusieurs CV avec un seul compte ?",
    a: "Pour l'instant, un compte gère un CV à la fois : vous pouvez le modifier librement, mais pas garder plusieurs versions séparées en parallèle.",
  },
  {
    q: "Comment obtenir une lettre de motivation ?",
    a: "En activant le Pack Candidature Complète dans l'éditeur : vous obtenez votre CV et une lettre de motivation au même style, dans un seul PDF, pour 1 500 FCFA.",
  },
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Vos informations ne sont ni vendues ni partagées à des fins commerciales, et servent uniquement à générer votre CV. La seule exception est la fonction IA, facultative : si vous l'utilisez, le texte concerné est envoyé à un prestataire d'IA tiers. Vous pouvez demander la suppression de vos données à tout moment via WhatsApp. Détails complets dans nos Conditions d'utilisation.",
  },
  {
    q: "Puis-je importer mon ancien CV ?",
    a: "Oui, si vous êtes connecté : à l'étape « Infos » de l'éditeur, choisissez votre CV au format PDF (exporté depuis Word ou Google Docs, pas un scan). Les rubriques se remplissent automatiquement, puis vous relisez et corrigez ce qui doit l'être. Votre email et votre téléphone ne sont pas envoyés à l'IA.",
  },
  {
    q: "Y a-t-il une aide par intelligence artificielle ?",
    a: "Oui, de façon facultative et gratuite, avec une limite quotidienne. Un bouton « Améliorer avec l'IA » reformule une description ou une lettre de motivation, sans inventer de faits. Relisez toujours le résultat : l'IA peut se tromper.",
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
