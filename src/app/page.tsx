"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, LayoutTemplate, ScanSearch, Smartphone, Upload, Wand2 } from "lucide-react";
import TemplateGallery from "@/components/landing/TemplateGallery";
import FAQSection from "@/components/landing/FAQSection";
import Reveal from "@/components/landing/Reveal";
import HeroDemoVideo from "@/components/landing/HeroDemoVideo";
import { useAuth } from "@/lib/AuthContext";
import { ENTRY_GATE_KEY } from "@/lib/entryGate";
import { PASS_PRICE, PASS_DAYS, formatFcfa } from "@/lib/pricing";

/**
 * ============================================================================
 * Cinquième passe — refonte COMPLÈTE de l'interface, alignée sur l'identité
 * déjà visible dans l'aperçu du lien (public/og-image-v7.png) et le logo
 * (public/logo.svg) : fond vert forêt profond avec halo émeraude en haut à
 * droite, carte blanche arrondie, accent orange pour "lu." et le prix.
 *
 * Palette (identique au logo / à l'OG) :
 *   #0C3B2E forêt · #08251D forêt profond · #157A52 émeraude · #F26B1D orange
 *   #E3F0E9 menthe · #F4F9F6 fond clair · #1A2E28 texte
 *
 * Structure volontairement courte (8 blocs) : hero sombre → scanner ATS gratuit → 3 étapes → modèles
 * (vrais aperçus) → tarifs → FAQ → CTA final → pied de page.
 * Retirés : section ATS + ScanCard (faux score), avis, bandeau de stats,
 * badges flottants. Aucun faux aperçu, aucune stat inventée.
 * ============================================================================
 */

const FOREST = "#0C3B2E";
const DEEP = "#08251D";
const EMERALD = "#157A52";
const ORANGE = "#F26B1D";
const MINT = "#E3F0E9";
const PAPER = "#F4F9F6";
const INK = "#1A2E28";

const DARK_BG = `radial-gradient(900px 520px at 88% 0%, rgba(21,122,82,0.55), transparent 62%), radial-gradient(520px 320px at 0% 100%, rgba(242,107,29,0.14), transparent 65%), linear-gradient(165deg, ${FOREST} 0%, ${DEEP} 100%)`;

const STEPS = [
  { icon: FileText, titre: "Remplis ton parcours", texte: "Expériences, formation, compétences : section par section, depuis ton téléphone." },
  { icon: LayoutTemplate, titre: "Choisis un modèle", texte: "15 modèles, et tu changes de style ou de couleur quand tu veux." },
  { icon: Smartphone, titre: "Vérifie, paie, télécharge", texte: "Aperçu avant paiement, puis paiement Mobile Money : ton PDF est prêt." },
];

function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <rect x="9" y="4" width="26" height="36" rx="5" fill="#fff" />
      <rect x="14" y="11" width="16" height="3" rx="1.5" fill={FOREST} />
      <rect x="14" y="17" width="13" height="2.5" rx="1.25" fill="#9DCDB7" />
      <rect x="14" y="22" width="15" height="2.5" rx="1.25" fill="#9DCDB7" />
      <circle cx="33" cy="34" r="11" fill={ORANGE} />
      <path d="M28 34l3.6 3.6 6.4-7.4" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export default function Home() {
  const { isAdmin } = useAuth();
  const ctaHref = "/editor";
  const heroRef = useRef<HTMLElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ENTRY_GATE_KEY, "1");
    } catch {
      // sessionStorage indisponible : l'éditeur reste simplement accessible.
    }
  }, []);

  // Barre CTA mobile : visible seulement une fois le hero dépassé.
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const focus = "focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden font-sans" style={{ background: PAPER, color: INK }}>
      {/* ===================== HERO sombre (header inclus) ===================== */}
      <section ref={heroRef} className="relative text-white" style={{ background: DARK_BG }} aria-labelledby="hero-heading">
        {/* Bandeau permanent : le scanner de CV est un outil gratuit qui attire
            à lui seul du monde, il doit être visible dès la première seconde,
            sur téléphone comme sur ordinateur. */}
        <Link
          href="/scanner-cv"
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-center text-[13px] sm:text-sm font-semibold hover:brightness-110 transition"
          style={{ background: ORANGE }}
        >
          <ScanSearch size={16} className="flex-shrink-0" />
          <span>Scanner ATS gratuit : ton CV passe-t-il les logiciels de tri ?</span>
          <ArrowRight size={15} className="flex-shrink-0" />
        </Link>
        <header className="flex items-center justify-between px-4 sm:px-6 py-5 max-w-6xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-base sm:text-lg tracking-tight" aria-label="MON CV PRO CI — accueil">
            <LogoMark />
            <span>
              MON CV PRO <span style={{ color: ORANGE }}>CI</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/75" aria-label="Navigation principale">
            <a href="#modeles" className="hover:text-white transition">Modèles</a>
            <a href="#tarifs" className="hover:text-white transition">Tarifs</a>
            <Link href="/scanner-cv" className="inline-flex items-center gap-2 font-semibold text-white hover:opacity-90 transition">
              Scanner mon CV
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: ORANGE }}>Gratuit</span>
            </Link>
            <a href="#faq" className="hover:text-white transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-semibold border border-white/30 text-white hover:bg-white/10 transition">
                Admin
              </Link>
            )}
            <Link
              href={ctaHref}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 ${focus}`}
              style={{ background: ORANGE, outlineColor: "#fff" }}
            >
              Créer mon CV
            </Link>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-20 sm:pt-14 sm:pb-28 grid lg:grid-cols-[1.15fr_0.85fr] gap-14 lg:gap-8 items-center">
          <div className="text-center lg:text-left">
            <h1
              id="hero-heading"
              className="font-display font-bold leading-[1.05] tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 4.6rem)" }}
            >
              Ton CV mérite
              <br />
              d&apos;être <span style={{ color: ORANGE }}>lu.</span>
            </h1>
            <p className="mx-auto lg:mx-0 mb-8 text-white/80" style={{ maxWidth: "34rem", fontSize: "1.1rem", lineHeight: 1.65 }}>
              Choisis un modèle, remplis ton parcours et télécharge ton CV en PDF, directement depuis ton téléphone.
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 mb-9">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">15 modèles</span>
              <Link href="/scanner-cv" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition">Scanner ATS gratuit</Link>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Paiement Mobile Money</span>
              <span className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: ORANGE }}>{formatFcfa(PASS_PRICE)} FCFA · CV + lettre</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Link
                href={ctaHref}
                className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white transition hover:brightness-110 ${focus}`}
                style={{ background: ORANGE, outlineColor: "#fff", minHeight: 52 }}
              >
                Créer mon CV <ArrowRight size={18} />
              </Link>
              <Link
                href="/scanner-cv"
                className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold border-2 border-white/40 text-white hover:bg-white/10 transition ${focus}`}
                style={{ outlineColor: "#fff", minHeight: 52 }}
              >
                <ScanSearch size={18} /> Scanner mon CV · gratuit
              </Link>
            </div>
            <p className="mt-5 text-sm text-white/60">
              Aperçu avant paiement · Sans abonnement ·{" "}
              <a href="#modeles" className="underline underline-offset-2 hover:text-white">Voir les modèles</a>
            </p>
          </div>

          {/* Vraie capture de l'éditeur (pas de faux aperçu) */}
          <div className="relative flex justify-center">
            <div aria-hidden className="absolute -inset-8 rounded-full blur-3xl" style={{ background: "rgba(21,122,82,0.35)" }} />
            <div className="relative">
              <HeroDemoVideo />
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Scanner ATS gratuit ===================== */}
      <section className="px-4 sm:px-6 pt-16 sm:pt-20" aria-labelledby="scanner-heading">
        <div
          className="max-w-5xl mx-auto rounded-[2rem] border bg-white px-6 sm:px-10 py-10 sm:py-12 grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-center"
          style={{ borderColor: MINT, boxShadow: `0 24px 50px -30px ${FOREST}66` }}
        >
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white mb-4" style={{ background: EMERALD }}>
              <ScanSearch size={13} /> Outil gratuit · sans inscription
            </span>
            <h2 id="scanner-heading" className="font-display font-bold mb-3" style={{ color: FOREST, fontSize: "clamp(1.7rem, 4vw, 2.3rem)", lineHeight: 1.1 }}>
              Ton CV actuel passe-t-il les logiciels de tri&nbsp;?
            </h2>
            <p className="mb-6" style={{ lineHeight: 1.65, color: `${INK}b3`, maxWidth: "32rem" }}>
              Dépose ton CV en PDF : en quelques secondes, tu vois ton score ATS et les points à corriger. L&apos;analyse se fait dans ton navigateur. Ensuite, importe ce même CV dans l&apos;éditeur et améliore-le directement.
            </p>
            <Link
              href="/scanner-cv"
              className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white transition hover:brightness-110 ${focus}`}
              style={{ background: ORANGE, outlineColor: FOREST, minHeight: 52 }}
            >
              Scanner mon CV gratuitement <ArrowRight size={18} />
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <ol className="space-y-3">
              {[
                { icon: Upload, titre: "Dépose ton CV (PDF)", texte: "Aucun compte, aucun envoi sur un serveur." },
                { icon: ScanSearch, titre: "Vois ton score ATS", texte: "Les critères validés et ceux à corriger." },
                { icon: Wand2, titre: "Améliore-le dans l'éditeur", texte: "Ton CV est repris, tu choisis un modèle et tu corriges." },
              ].map((item) => (
                <li key={item.titre} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: PAPER }}>
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: MINT, color: EMERALD }}>
                    <item.icon size={19} />
                  </span>
                  <span>
                    <span className="block font-display font-bold" style={{ color: FOREST }}>{item.titre}</span>
                    <span className="block text-sm" style={{ color: `${INK}b3` }}>{item.texte}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ===================== 3 étapes ===================== */}
      <section className="px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="steps-heading">
        <div className="max-w-5xl mx-auto">
          <h2 id="steps-heading" className="font-display font-bold text-center mb-12 sm:mb-14" style={{ color: FOREST, fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
            Trois étapes, c&apos;est tout.
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <Reveal key={step.titre} delay={i * 100}>
                <div className="h-full rounded-3xl bg-white p-7 border" style={{ borderColor: MINT, boxShadow: `0 18px 40px -26px ${FOREST}55` }}>
                  <div className="flex items-center justify-between mb-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: MINT, color: EMERALD }}>
                      <step.icon size={22} />
                    </span>
                    <span className="font-display font-bold text-5xl leading-none" style={{ color: ORANGE }} aria-hidden>
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2" style={{ color: FOREST }}>{step.titre}</h3>
                  <p className="text-[15px]" style={{ lineHeight: 1.65, color: `${INK}b3` }}>{step.texte}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== Modèles (vrais aperçus) ===================== */}
      <section id="modeles" className="px-4 sm:px-6 pb-20 sm:pb-24 scroll-mt-4" aria-labelledby="modeles-heading">
        <div className="max-w-6xl mx-auto rounded-[2rem] bg-white border px-4 sm:px-10 py-12 sm:py-14" style={{ borderColor: MINT }}>
          <Reveal className="text-center mb-10">
            <h2 id="modeles-heading" className="font-display font-bold mb-3" style={{ color: FOREST, fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
              Un modèle pour chaque profil
            </h2>
            <p className="mx-auto" style={{ maxWidth: "34rem", lineHeight: 1.65, color: `${INK}b3` }}>
              Change de modèle et de couleur à tout moment, avec un aperçu en direct.
            </p>
          </Reveal>
          <TemplateGallery showCompare={false} showFilters={false} />
        </div>
      </section>

      {/* ===================== Tarifs (bloc sombre) ===================== */}
      <section id="tarifs" className="px-4 sm:px-6 py-20 sm:py-24 text-white scroll-mt-4" style={{ background: DARK_BG }} aria-labelledby="tarifs-heading">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 id="tarifs-heading" className="font-display font-bold mb-3" style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
              Un prix clair, sans abonnement.
            </h2>
            <p className="text-white/75">Tu vois ton CV avant de payer. Un seul paiement (Mobile Money ou carte), et tu modifies et télécharges autant que tu veux pendant {PASS_DAYS} jours.</p>
          </Reveal>

          <Reveal>
            <div className="relative mx-auto max-w-md rounded-3xl bg-white p-8" style={{ color: INK, boxShadow: `0 0 0 3px ${ORANGE}` }}>
              <span className="absolute -top-3.5 left-8 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white" style={{ background: ORANGE }}>
                Une seule offre
              </span>
              <p className="text-sm font-semibold mb-5" style={{ color: `${INK}99` }}>Pass Candidature</p>
              <p className="font-display font-bold leading-none mb-1" style={{ color: FOREST, fontSize: "3.2rem" }}>
                {formatFcfa(PASS_PRICE)}<span className="text-lg font-semibold ml-2" style={{ color: `${INK}80` }}>FCFA</span>
              </p>
              <p className="text-sm mb-7" style={{ color: `${INK}80` }}>un seul paiement, valable {PASS_DAYS} jours</p>
              <ul className="space-y-3 text-[15px]">
                {[
                  "CV + lettre de motivation assortie",
                  `Modifications illimitées pendant ${PASS_DAYS} jours`,
                  `Téléchargements PDF illimités pendant ${PASS_DAYS} jours`,
                  "15 modèles, aperçu avant paiement",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: MINT, color: EMERALD }}><Check size={14} /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                className={`mt-8 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110 ${focus}`}
                style={{ background: ORANGE, outlineColor: FOREST }}
              >
                Créer mon CV <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="px-4 sm:px-6 py-20 sm:py-24 scroll-mt-4" aria-labelledby="faq-heading">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 id="faq-heading" className="font-display font-bold" style={{ color: FOREST, fontSize: "clamp(1.8rem, 4vw, 2.5rem)" }}>
              Questions fréquentes
            </h2>
          </Reveal>
          <div className="rounded-3xl bg-white border px-5 sm:px-8 py-2" style={{ borderColor: MINT }}>
            <FAQSection pick={[0, 1, 2, 3, 4]} />
          </div>
        </div>
      </section>

      {/* ===================== CTA final ===================== */}
      <section className="px-4 sm:px-6 pb-20" aria-labelledby="cta-final-heading">
        <div className="max-w-5xl mx-auto rounded-[2rem] text-center text-white px-6 py-14 sm:py-16" style={{ background: DARK_BG }}>
          <Reveal>
            <h2 id="cta-final-heading" className="font-display font-bold mx-auto mb-3" style={{ fontSize: "clamp(1.8rem, 4.5vw, 2.8rem)", maxWidth: "20ch", lineHeight: 1.1 }}>
              Ton CV mérite d&apos;être <span style={{ color: ORANGE }}>lu.</span>
            </h2>
            <p className="text-white/75 mb-8">Commence maintenant, tu ne paies que quand ton CV est prêt.</p>
            <Link
              href={ctaHref}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-base font-bold text-white transition hover:brightness-110 ${focus}`}
              style={{ background: ORANGE, outlineColor: "#fff", minHeight: 52 }}
            >
              Créer mon CV <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ===================== Footer ===================== */}
      <footer className="text-white px-4 sm:px-6 pt-12 pb-28 sm:pb-10" style={{ background: DEEP }}>
        <div className="max-w-6xl mx-auto grid gap-10 sm:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 font-display font-bold mb-3">
              <LogoMark size={32} />
              <span>MON CV PRO <span style={{ color: ORANGE }}>CI</span></span>
            </div>
            <p className="text-sm text-white/60" style={{ maxWidth: "30ch", lineHeight: 1.6 }}>
              Créateur de CV pensé pour le marché ivoirien. Tes données restent confidentielles.
            </p>
          </div>
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Produit">
            <span className="text-xs uppercase tracking-[0.12em] text-white/40 mb-1">Produit</span>
            <a href="#modeles" className="text-white/75 hover:text-white transition">Modèles</a>
            <a href="#tarifs" className="text-white/75 hover:text-white transition">Tarifs</a>
            <Link href="/scanner-cv" className="text-white/75 hover:text-white transition">Scanner mon CV</Link>
          </nav>
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Légal">
            <span className="text-xs uppercase tracking-[0.12em] text-white/40 mb-1">Légal</span>
            <Link href="/cgu" className="text-white/75 hover:text-white transition">Conditions d&apos;utilisation</Link>
            <Link href="/cgu#confidentialite" className="text-white/75 hover:text-white transition">Confidentialité</Link>
            <Link href="/a-propos" className="text-white/75 hover:text-white transition">À propos</Link>
          </nav>
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Contact">
            <span className="text-xs uppercase tracking-[0.12em] text-white/40 mb-1">Contact</span>
            <a href="https://wa.me/2250545177571" target="_blank" rel="noopener noreferrer" className="text-white/75 hover:text-white transition">WhatsApp</a>
            <a href="tel:+2250545177571" className="text-white/75 hover:text-white transition">+225 05 45 17 75 71</a>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 text-xs text-white/45">
          © {new Date().getFullYear()} MON CV PRO CI. Tous droits réservés.
        </div>
      </footer>

      {/* ===================== CTA mobile (après le hero) ===================== */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 transition-transform duration-300 ${showSticky ? "translate-y-0" : "translate-y-full"}`}
        style={{ background: `${DEEP}f2`, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        aria-hidden={!showSticky}
      >
        <Link
          href={ctaHref}
          tabIndex={showSticky ? 0 : -1}
          className="flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-bold text-white"
          style={{ background: ORANGE }}
        >
          Pass {PASS_DAYS} jours : {formatFcfa(PASS_PRICE)} FCFA · Créer mon CV <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
