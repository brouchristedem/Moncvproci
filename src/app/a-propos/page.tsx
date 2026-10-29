import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Christ Edem, étudiant en Licence 3 Logistique à Abidjan, crée MON CV PRO CI : un éditeur de CV simple pour les étudiants et chercheurs d'emploi en Côte d'Ivoire.",
};

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
            Étudiant en Licence 3 Logistique à Abidjan, je crée des outils web simples pour les étudiants et les chercheurs d&apos;emploi en Côte d&apos;Ivoire.
          </p>
        </section>

        <section className="rounded-3xl p-6 text-left space-y-2" style={{ background: `${MINT}88` }}>
          <h2 className="font-bold font-['Space_Grotesk'] text-lg" style={{ color: FOREST }}>MON CV PRO CI</h2>
          <p className="text-sm leading-relaxed">
            MON CV PRO CI est un éditeur de CV gratuit avec 15 modèles. Le téléchargement du CV en PDF est payant, à chaque téléchargement.
          </p>
          <p className="text-sm leading-relaxed">
            Un scanner ATS gratuit vous aide aussi à vérifier si votre CV passe bien les logiciels de tri des recruteurs.
          </p>
        </section>

        <section className="rounded-3xl p-6 text-left space-y-2 border" style={{ borderColor: MINT }}>
          <h2 className="font-bold font-['Space_Grotesk'] text-lg" style={{ color: FOREST }}>Vos données</h2>
          <p className="text-sm leading-relaxed">
            Les informations saisies dans l&apos;éditeur servent uniquement à générer votre CV : elles ne sont ni vendues ni partagées avec des tiers à des fins commerciales. Pour le détail, consultez les{" "}
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
          <p className="text-sm">
            Mon portfolio :{" "}
            <a href="https://christedem.vercel.app" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: EMERALD }}>
              christedem.vercel.app
            </a>
          </p>
        </section>

        <p className="text-xs pt-6 border-t" style={{ borderColor: MINT, color: `${INK}80` }}>
          Un site Edem Digital Group
        </p>
      </main>
    </div>
  );
}
