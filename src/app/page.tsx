"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import TemplateGallery from "@/components/landing/TemplateGallery";
import ScanCard from "@/components/landing/ScanCard";
import AtsCriteriaGrid from "@/components/landing/AtsCriteriaGrid";
import AvisSection from "@/components/landing/AvisSection";
import FAQSection from "@/components/landing/FAQSection";
import Reveal from "@/components/landing/Reveal";
import HeroDemoVideo from "@/components/landing/HeroDemoVideo";
import { ENTRY_GATE_KEY } from "@/lib/entryGate";

/**
 * ============================================================================
 * Quatrième passe sur cette page — brief très précis fourni par Christ,
 * appliqué à la lettre. Récapitulatif pour la prochaine session :
 *
 * PALETTE EXACTE (aucune autre couleur, aucune dans les tokens brand- ou
 * accent- du thème global — ce sont des valeurs arbitraires volontairement
 * différentes, pour ne pas modifier l'éditeur ni les vrais templates de CV
 * qui utilisent, eux, ces tokens brand-/accent-) :
 *   #FFFFFF fond universel · #0C3B2E vert forêt (titres uniquement, plus
 *   aucun bloc plein — retiré du CTA final et du footer sur demande) ·
 *   #157A52 vert émeraude (boutons, liens, icônes, étoiles) · #F26B1D
 *   orange (1 seul élément par section maximum) · #E3F0E9 menthe très clair
 *   (fonds d'icônes, badges discrets, bordures fines) · #1A2E28 texte courant.
 *
 * RETIRÉ SUR DEMANDE EXPLICITE ("je ne veux plus jamais voir ça") : toute
 * la section de filtres (mise en page / style) de la galerie de modèles.
 * TemplateGallery le supporte via showFilters={false} — ne pas la remettre.
 *
 * Police mono (JetBrains Mono) réservée à UN seul usage : les deux labels
 * techniques dans ScanCard ("Analyse.pdf", "Scan ATS"). Partout ailleurs
 * (prix, stats, étapes) : Space Grotesk (titres/chiffres forts) ou Inter
 * (corps, chargée ici uniquement, pas sur le reste du site).
 *
 * Alignement : tout le texte est centré (voir consigne). Les composants
 * interactifs (grille de modèles, accordéon FAQ) gardent leur structure
 * propre ; seul leur contenu textuel est centré autant que l'usage le
 * permet.
 *
 * Écart assumé : pas de photo humaine dans le hero (demandée dans le
 * brief). Je n'ai pas de photo réelle d'un candidat ivoirien à disposition,
 * et une photo de banque d'images non vérifiée poserait un problème de
 * droits sur un site commercial — je ne l'ai donc pas inventée. L'aperçu
 * de CV réel (incliné, en perspective) tient la place du visuel du hero.
 * Si Christ fournit une photo, elle se glisse facilement à côté.
 * ============================================================================
 */

const EMERALD = "#157A52";
const FOREST = "#0C3B2E";
const ORANGE = "#F26B1D";
const MINT = "#E3F0E9";
const INK = "#1A2E28";

const STEPS = [
  { titre: "Remplissez vos informations", texte: "Votre parcours, section par section, dans l'éditeur." },
  { titre: "Choisissez un modèle", texte: "15 styles, changez de couleur à tout moment." },
  { titre: "Testez, puis payez par Wave", texte: "Aperçu gratuit avant paiement — 1 000 FCFA le CV seul." },
];

const PROOF = [
  { chiffre: "15", label: "modèles" },
  { chiffre: "1 000", label: "FCFA / CV" },
  { chiffre: "0", label: "abonnement" },
  { chiffre: "Wave", label: "sans carte" },
];

export default function Home() {
  const ctaHref = "/editor";

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ENTRY_GATE_KEY, "1");
    } catch {
      // sessionStorage indisponible (navigation privée stricte, etc.) : on
      // laisse simplement l'éditeur accessible sans bloquer la personne.
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-white font-['Inter']" style={{ color: INK }}>
      {/* ===== Navigation ===== */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-5 max-w-6xl mx-auto w-full">
        <span className="flex items-center gap-2.5 font-bold text-lg tracking-tight font-['Space_Grotesk']" style={{ color: FOREST }}>
          <span aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ background: EMERALD }} />
          MON CV PRO CI
        </span>
        <nav className="hidden sm:flex items-center gap-7 text-sm" style={{ color: `${INK}99` }} aria-label="Navigation principale">
          <a href="#modeles" className="hover:opacity-70 transition focus-visible:outline-2 focus-visible:outline-offset-2 rounded" style={{ outlineColor: EMERALD }}>Modèles</a>
          <a href="#scan-ats" className="hover:opacity-70 transition focus-visible:outline-2 focus-visible:outline-offset-2 rounded" style={{ outlineColor: EMERALD }}>Scan ATS</a>
          <a href="#tarifs" className="hover:opacity-70 transition focus-visible:outline-2 focus-visible:outline-offset-2 rounded" style={{ outlineColor: EMERALD }}>Tarifs</a>
          <a href="#faq" className="hover:opacity-70 transition focus-visible:outline-2 focus-visible:outline-offset-2 rounded" style={{ outlineColor: EMERALD }}>FAQ</a>
        </nav>
        <Link
          href={ctaHref}
          className="rounded-full text-white px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: EMERALD, outlineColor: EMERALD }}
        >
          Créer mon CV
        </Link>
      </header>

      {/* ===== Hero — tout centré ===== */}
      <section className="px-4 sm:px-6 pt-6 pb-16 sm:pt-10 sm:pb-24" aria-labelledby="hero-heading">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <h1
            id="hero-heading"
            className="font-['Space_Grotesk'] font-bold leading-[1.12] mb-5"
            style={{ color: FOREST, fontSize: "clamp(2.1rem, 5.5vw, 3.5rem)" }}
          >
            Le CV qui vous décroche l&apos;entretien.
          </h1>
          <p
            className="mb-9"
            style={{ maxWidth: "38rem", lineHeight: 1.7, color: `${INK}cc`, fontSize: "1rem" }}
          >
            15 modèles pensés pour le marché ivoirien, un éditeur gratuit et un score ATS
            inclus. Vous ne payez qu&apos;au moment de télécharger.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-14">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center gap-2 rounded-full text-white px-7 py-3.5 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: EMERALD, outlineColor: EMERALD }}
            >
              Commencer gratuitement <ArrowRight size={16} />
            </Link>
            <Link
              href="#modeles"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold border-2 transition hover:bg-[#157A52]/5 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: EMERALD, color: EMERALD, outlineColor: EMERALD }}
            >
              Voir les 15 modèles
            </Link>
          </div>

          {/* Vidéo réelle de l'éditeur (capture d'écran) — visuel du hero (voir note sur la photo en tête de fichier) */}
          <div className="relative" style={{ perspective: "1400px" }}>
            <HeroDemoVideo />

            {/* Badges flottants symétriques, en menthe */}
            <span
              className="hidden sm:flex absolute top-6 -left-24 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
              style={{ background: MINT, color: EMERALD }}
            >
              <Check size={13} /> Score ATS 96
            </span>
            <span
              className="hidden sm:flex absolute bottom-10 -right-28 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
              style={{ background: MINT, color: EMERALD }}
            >
              <Check size={13} /> PDF prêt en 5 min
            </span>
          </div>
        </div>

        {/* Bandeau de preuves — une ligne compacte, centrée */}
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mt-16 pt-8 border-t max-w-3xl mx-auto" style={{ borderColor: MINT }}>
          {PROOF.map((item) => (
            <div key={item.label} className="flex items-baseline gap-2">
              <span className="font-['Space_Grotesk'] text-xl sm:text-2xl font-bold" style={{ color: FOREST }}>{item.chiffre}</span>
              <span className="text-xs" style={{ color: `${INK}80` }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Comment ça marche — centré, icône au-dessus du titre ===== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="steps-heading">
        <h2
          id="steps-heading"
          className="font-['Space_Grotesk'] font-bold text-center mb-12"
          style={{ color: FOREST, fontSize: "2rem" }}
        >
          Trois étapes, un CV prêt
        </h2>
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-10 sm:gap-6 relative">
          <div aria-hidden className="hidden sm:block absolute top-6 left-[16.5%] right-[16.5%] h-px" style={{ background: MINT }} />
          {STEPS.map((step, i) => (
            <Reveal key={step.titre} delay={i * 120} className="flex flex-col items-center text-center">
              <span
                className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full font-['Space_Grotesk'] font-bold mb-4"
                style={{ background: MINT, color: EMERALD }}
              >
                {i + 1}
              </span>
              <h3 className="font-semibold text-base mb-1.5">{step.titre}</h3>
              <p className="text-sm max-w-[26ch]" style={{ color: `${INK}99`, lineHeight: 1.6 }}>{step.texte}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Modèles — sans filtres, sans sélecteur de profil ===== */}
      <section id="modeles" className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: `${MINT}66` }} aria-labelledby="modeles-heading">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 id="modeles-heading" className="font-['Space_Grotesk'] font-bold mb-2" style={{ color: FOREST, fontSize: "2rem" }}>
              Un modèle pour chaque profil
            </h2>
            <p className="mx-auto" style={{ maxWidth: "38rem", lineHeight: 1.7, color: `${INK}99` }}>
              Changez de modèle et de couleur à tout moment, en aperçu direct dans l&apos;éditeur.
            </p>
          </Reveal>
          <TemplateGallery showCompare={false} showFilters={false} />
        </div>
      </section>

      {/* ===== Scan ATS — centré, la jauge et la checklist comme preuve ===== */}
      <section id="scan-ats" className="px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="ats-heading">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <Reveal>
            <h2 id="ats-heading" className="font-['Space_Grotesk'] font-bold mb-4" style={{ color: FOREST, fontSize: "2rem" }}>
              Un CV parfait ne suffit pas s&apos;il n&apos;est jamais lu
            </h2>
            <p className="mx-auto" style={{ maxWidth: "38rem", lineHeight: 1.7, color: `${INK}99` }}>
              La majorité des grandes entreprises filtrent les candidatures avec un logiciel
              avant qu&apos;un humain ne les voie. Voici les 8 critères vérifiés en direct
              dans l&apos;éditeur, avec un score en temps réel.
            </p>
          </Reveal>
        </div>

        <Reveal className="mb-14">
          <ScanCard />
        </Reveal>

        <div className="max-w-4xl mx-auto mb-10">
          <AtsCriteriaGrid />
        </div>

        <div className="text-center">
          <Link
            href="/scanner-cv"
            className="inline-flex items-center gap-2 rounded-full text-white px-7 py-3.5 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: EMERALD, outlineColor: EMERALD }}
          >
            Scanner mon CV actuel (gratuit) <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ===== Tarifs — 2 cartes, orange réservé au badge (pas au prix) ===== */}
      <section id="tarifs" className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: `${MINT}66` }} aria-labelledby="tarifs-heading">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal className="mb-10">
            <h2 id="tarifs-heading" className="font-['Space_Grotesk'] font-bold mb-2" style={{ color: FOREST, fontSize: "2rem" }}>
              Un tarif simple, sans abonnement
            </h2>
            <p style={{ color: `${INK}99` }}>Aperçu gratuit avant tout paiement. Payez par Wave, sans carte bancaire.</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <Reveal>
              <div className="h-full rounded-2xl bg-white px-8 pt-8 pb-7 text-center" style={{ boxShadow: `0 10px 30px -18px ${FOREST}33` }}>
                <p className="text-sm font-medium mb-4" style={{ color: `${INK}b3` }}>CV seul</p>
                <p className="font-['Space_Grotesk'] text-4xl font-bold mb-1" style={{ color: EMERALD }}>
                  1 000<span className="text-base font-normal ml-1.5" style={{ color: `${INK}66` }}>FCFA</span>
                </p>
                <p className="text-xs mb-6" style={{ color: `${INK}80` }}>par téléchargement</p>
                <ul className="text-sm space-y-2 inline-block text-left" style={{ color: `${INK}cc` }}>
                  <li className="flex items-center gap-2"><Check size={14} style={{ color: EMERALD }} /> PDF haute qualité</li>
                  <li className="flex items-center gap-2"><Check size={14} style={{ color: EMERALD }} /> Score ATS inclus</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div
                className="h-full relative rounded-2xl bg-white px-8 pt-9 pb-7 text-center sm:-translate-y-3"
                style={{ boxShadow: `0 20px 45px -18px ${FOREST}4d`, border: `2px solid ${EMERALD}` }}
              >
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full text-white text-[10px] font-semibold uppercase tracking-wide px-3 py-1"
                  style={{ background: ORANGE }}
                >
                  Recommandé
                </span>
                <p className="text-sm font-medium mb-4" style={{ color: `${INK}b3` }}>Pack Candidature Complète</p>
                <p className="font-['Space_Grotesk'] text-4xl font-bold mb-1" style={{ color: EMERALD }}>
                  1 500<span className="text-base font-normal ml-1.5" style={{ color: `${INK}66` }}>FCFA</span>
                </p>
                <p className="text-xs mb-6" style={{ color: `${INK}80` }}>par téléchargement</p>
                <ul className="text-sm space-y-2 inline-block text-left" style={{ color: `${INK}cc` }}>
                  <li className="flex items-center gap-2"><Check size={14} style={{ color: EMERALD }} /> CV + lettre assortie</li>
                  <li className="flex items-center gap-2"><Check size={14} style={{ color: EMERALD }} /> Un seul PDF prêt à l&apos;envoi</li>
                  <li className="flex items-center gap-2"><Check size={14} style={{ color: EMERALD }} /> Score ATS inclus</li>
                </ul>
              </div>
            </Reveal>
          </div>

          <Link
            href={ctaHref}
            className="mt-10 inline-flex items-center gap-2 rounded-full text-white px-7 py-3.5 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: EMERALD, outlineColor: EMERALD }}
          >
            Créer mon CV maintenant <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ===== Avis — 3 max, centré (voir AvisSection.tsx) ===== */}
      <section id="avis" className="px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="avis-heading">
        <div className="max-w-6xl mx-auto text-center">
          <Reveal className="mb-10">
            <h2 id="avis-heading" className="font-['Space_Grotesk'] font-bold" style={{ color: FOREST, fontSize: "2rem" }}>
              Ce qu&apos;en pensent nos utilisateurs
            </h2>
          </Reveal>
          <AvisSection />
        </div>
      </section>

      {/* ===== FAQ — 7 questions, centré ===== */}
      <section id="faq" className="px-4 sm:px-6 py-16 sm:py-20" style={{ background: `${MINT}66` }} aria-labelledby="faq-heading">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal className="mb-10">
            <h2 id="faq-heading" className="font-['Space_Grotesk'] font-bold" style={{ color: FOREST, fontSize: "2rem" }}>
              Questions fréquentes
            </h2>
          </Reveal>
          <FAQSection pick={[0, 5, 1, 2, 9, 10, 8]} />
        </div>
      </section>

      {/* ===== CTA final — fond BLANC, titre en vert forêt, plus de bloc plein ===== */}
      <section className="px-4 sm:px-6 py-20 text-center" aria-labelledby="cta-final-heading">
        <Reveal>
          <h2
            className="font-['Space_Grotesk'] font-bold mx-auto mb-8"
            id="cta-final-heading"
            style={{ color: FOREST, fontSize: "2rem", maxWidth: "24ch" }}
          >
            Votre prochain emploi commence par un bon CV.
          </h2>
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-full text-white px-8 py-4 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: EMERALD, outlineColor: EMERALD }}
          >
            Créer mon CV maintenant <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>

      {/* ===== Footer — fond BLANC, 3 colonnes centrées, texte vert/ink ===== */}
      <footer className="px-4 sm:px-6 pt-10 pb-28 sm:pb-10 border-t" style={{ borderColor: MINT }}>
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10 text-center">
          <div>
            <p className="font-semibold mb-1.5 text-sm font-['Space_Grotesk']" style={{ color: FOREST }}>MON CV PRO CI</p>
            <p className="text-xs mx-auto" style={{ maxWidth: "32ch", color: `${INK}80`, lineHeight: 1.6 }}>
              Créateur de CV professionnel pensé pour le marché ivoirien. Vos données restent confidentielles.
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-10 text-xs" aria-label="Pied de page">
            <div className="flex flex-col items-center gap-2">
              <span className="uppercase tracking-[0.12em] text-[10px] mb-1" style={{ color: `${FOREST}99` }}>Produit</span>
              <a href="#modeles" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>Modèles</a>
              <a href="#scan-ats" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>Scan ATS</a>
              <Link href="/scanner-cv" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>Scanner mon CV</Link>
              <a href="#tarifs" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>Tarifs</a>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="uppercase tracking-[0.12em] text-[10px] mb-1" style={{ color: `${FOREST}99` }}>Légal</span>
              <Link href="/cgu" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>Conditions d&apos;utilisation</Link>
              <Link href="/cgu#confidentialite" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>Confidentialité</Link>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="uppercase tracking-[0.12em] text-[10px] mb-1" style={{ color: `${FOREST}99` }}>Contact</span>
              <a href="https://wa.me/2250545177571" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition" style={{ color: `${INK}b3` }}>
                WhatsApp
              </a>
              <span style={{ color: `${INK}b3` }}>+225 05 45 17 75 71</span>
            </div>
          </nav>
          <div className="pt-6 border-t w-full text-xs" style={{ borderColor: MINT, color: `${INK}80` }}>
            © {new Date().getFullYear()} MON CV PRO CI. Tous droits réservés.
          </div>
        </div>
      </footer>

      {/* ===== CTA sticky mobile ===== */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 bg-white/95 backdrop-blur border-t" style={{ borderColor: MINT }}>
        <Link
          href={ctaHref}
          className="flex items-center justify-center gap-2 rounded-full text-white px-5 py-3 text-sm font-semibold transition"
          style={{ background: EMERALD }}
        >
          Créer mon CV — 1 000 FCFA <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
