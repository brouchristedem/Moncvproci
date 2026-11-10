import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Christ Edem, étudiant en Licence 3 Administration des Affaires (spécialisation logistique) à Abidjan et développeur full-stack, crée MON CV PRO CI : créateur de CV et scanner ATS gratuit pour les étudiants et chercheurs d'emploi en Côte d'Ivoire.",
};

// Adresse du portfolio : à renseigner ici (une seule fois) pour qu'elle
// apparaisse sur la page. Tant qu'elle est vide, la ligne « Mon portfolio »
// est masquée plutôt que d'afficher un lien périmé.
const PORTFOLIO_URL = "";

const FOREST = "#0C3B2E";
const EMERALD = "#157A52";
const MINT = "#E3F0E9";
const INK = "#1A2E28";

export default function AProposPage() {
  return (
    <div className="min-h-screen bg-white font-['Inter']" style={{ color: INK }}>
      <header className="border-b px-4 sm:px-6 py-3" style={{ borderColor: MINT }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-sm hover:opacity-70 transition" style={{ color: `${INK}99` }}>
            <ArrowLeft size={15} /> Retour à l&apos;accueil
          </Link>
          <span className="font-bold text-sm font-['Space_Grotesk']" style={{ color: FOREST }}>MON CV PRO CI</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center space-y-10">
        <section className="flex flex-col items-center gap-4">
          <Image
            src="/edem.jpg"
            alt="Photo de Christ Edem"
            width={144}
            height={144}
            className="rounded-full object-cover w-36 h-36 border-4"
            style={{ borderColor: MINT }}
            priority
          />
          <h1 className="text-3xl font-bold font-['Space_Grotesk']" style={{ color: FOREST }}>Christ Edem</h1>
          <p className="text-base leading-relaxed" style={{ maxWidth: "46ch" }}>
            Étudiant en Licence 3 Administration des Affaires (spécialisation logistique) à Abidjan, je suis aussi développeur full-stack et fondateur de SaaS : je crée des outils web simples pour les étudiants, les chercheurs d&apos;emploi et les petits commerçants en Côte d&apos;Ivoire.
          </p>
        </section>

        <section className="rounded-3xl p-6 text-left space-y-2" style={{ background: `${MINT}88` }}>
          <h2 className="font-bold font-['Space_Grotesk'] text-lg" style={{ color: FOREST }}>MON CV PRO CI</h2>
          <p className="text-sm leading-relaxed">
            MON CV PRO CI est un créateur de CV pensé pour le marché ivoirien : 15 modèles, une version française et anglaise, une lettre de motivation assortie, et un paiement par Mobile Money (Wave, Orange, MTN, Moov) ou par carte.
          </p>
          <p className="text-sm leading-relaxed">
            Vous remplissez et mettez en page votre CV gratuitement, avec un aperçu avant de payer. Le Pass Candidature donne ensuite des modifications et des téléchargements PDF illimités, avec la lettre de motivation incluse, pendant 5 jours.
          </p>
          <p className="text-sm leading-relaxed">
            Le{" "}
            <Link href="/scanner-cv" className="underline" style={{ color: EMERALD }}>scanner ATS gratuit</Link>{" "}
            vérifie, sans compte, si votre CV passe bien les logiciels de tri des recruteurs. Vous pouvez ensuite importer ce même CV dans l&apos;éditeur pour l&apos;améliorer.
          </p>
        </section>

        <section className="rounded-3xl p-6 text-left space-y-2 border" style={{ borderColor: MINT }}>
          <h2 className="font-bold font-['Space_Grotesk'] text-lg" style={{ color: FOREST }}>Vos données</h2>
          <p className="text-sm leading-relaxed">
            Les informations saisies dans l&apos;éditeur servent uniquement à générer votre CV : elles ne sont ni vendues ni partagées avec des tiers à des fins commerciales. L&apos;analyse du scanner ATS se fait dans votre navigateur ; le contenu de votre CV n&apos;est envoyé à un service d&apos;IA que si vous demandez l&apos;import dans l&apos;éditeur. Pour le détail, consultez les{" "}
            <Link href="/cgu#confidentialite" className="underline" style={{ color: EMERALD }}>conditions d&apos;utilisation et la confidentialité</Link>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-bold font-['Space_Grotesk'] text-lg" style={{ color: FOREST }}>Une question ?</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/2250545177571"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full text-white px-5 py-3 text-sm font-semibold hover:opacity-90 transition"
              style={{ background: EMERALD }}
            >
              <MessageCircle size={16} /> Contacter sur WhatsApp
            </a>
            <a
              href="tel:+2250545177571"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold border hover:opacity-80 transition"
              style={{ color: EMERALD, borderColor: EMERALD }}
            >
              <Phone size={16} /> Appeler : +225 05 45 17 75 71
            </a>
          </div>
          {PORTFOLIO_URL && (
            <p className="text-sm">
              Mon portfolio :{" "}
              <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: EMERALD }}>
                {PORTFOLIO_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </p>
          )}
        </section>

        <p className="text-xs pt-6 border-t" style={{ borderColor: MINT, color: `${INK}80` }}>
          Un site Edem Digital Group
        </p>
      </main>
    </div>
  );
}
