"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

const CHECKS = [
  { label: "Structure", delay: 900 },
  { label: "Mots-clés", delay: 1500 },
  { label: "Format ATS", delay: 2100 },
];

// Couleurs exactes du brief (voir audit en tête de page.tsx) — appliquées en
// valeurs arbitraires ici plutôt que via les tokens brand-*/accent-* du
// thème global, pour ne pas modifier les couleurs de l'éditeur / des vrais
// templates de CV qui utilisent ces mêmes tokens.
const EMERALD = "#157A52";
const MINT = "#E3F0E9";
const INK = "#1A2E28";

export default function ScanCard() {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setStarted(true), 0);
      return () => clearTimeout(t);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    const fallback = setTimeout(() => setStarted(true), 1500);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    // La ligne de scan ne reste montée que le temps de son animation, pour
    // qu'elle disparaisse proprement à la fin au lieu de se figer à l'écran
    // et de masquer les informations en dessous.
    setSweeping(true);
    const sweepEnd = setTimeout(() => setSweeping(false), 2100);
    const timers = CHECKS.map((c, i) =>
      setTimeout(() => setChecked((prev) => prev.map((v, idx) => (idx === i ? true : v))), c.delay)
    );
    const startCount = setTimeout(() => {
      const target = 8;
      const duration = 1200;
      const startTime = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        setScore(Math.round(target * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 2200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(startCount);
      clearTimeout(sweepEnd);
    };
  }, [started]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[380px] select-none" aria-hidden>
      {/* halo doux derrière la carte, teinte émeraude uniquement */}
      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] blur-xl"
        style={{ background: `radial-gradient(circle, ${EMERALD}1a, transparent 70%)` }}
      />

      <div className="relative overflow-hidden rounded-2xl border border-[#E3F0E9] bg-white shadow-lg" style={{ boxShadow: `0 20px 40px -24px ${EMERALD}33` }}>
        {/* barre de titre type document — seul usage de la police mono de toute la page */}
        <div className="flex items-center gap-2 border-b border-[#E3F0E9] px-5 py-3.5">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: `${INK}26` }} />
            <span className="h-2 w-2 rounded-full" style={{ background: `${INK}26` }} />
            <span className="h-2 w-2 rounded-full" style={{ background: `${INK}26` }} />
          </div>
          <span className="ml-2 font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.16em]" style={{ color: `${INK}66` }}>
            Analyse.pdf
          </span>
          <span
            className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 font-['JetBrains_Mono'] text-[9px] uppercase tracking-wide"
            style={{ background: MINT, color: EMERALD }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sweeping ? "animate-pulse" : ""}`} style={{ background: EMERALD }} />
            {sweeping ? "Scan..." : "Scan ATS"}
          </span>
        </div>

        {/* corps du "CV", deux colonnes — libellés en sans-serif, pas en mono */}
        <div className="relative grid grid-cols-[36%_64%] gap-0 px-5 py-5">
          <div className="space-y-4 pr-4">
            <div className="h-11 w-11 rounded-full" style={{ background: MINT }} />
            <div className="space-y-1.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: `${EMERALD}b3` }}>
                Profil
              </span>
              <div className="h-1.5 w-full rounded-full" style={{ background: `${EMERALD}33` }} />
              <div className="h-1.5 w-4/5 rounded-full" style={{ background: `${EMERALD}26` }} />
              <div className="h-1.5 w-3/5 rounded-full" style={{ background: `${EMERALD}1a` }} />
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: `${EMERALD}80` }}>
                Compétences
              </span>
              <div className="h-1.5 w-full rounded-full" style={{ background: `${EMERALD}26` }} />
              <div className="h-1.5 w-2/3 rounded-full" style={{ background: `${EMERALD}1a` }} />
            </div>
          </div>
          <div className="space-y-4 border-l pl-4" style={{ borderColor: MINT }}>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-2 w-24 rounded-full" style={{ background: `${EMERALD}40` }} />
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: `${EMERALD}80` }}>
                  Expérience
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full" style={{ background: `${EMERALD}26` }} />
              <div className="h-1.5 w-full rounded-full" style={{ background: `${EMERALD}1a` }} />
              <div className="h-1.5 w-4/5 rounded-full" style={{ background: `${EMERALD}26` }} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="h-2 w-20 rounded-full" style={{ background: `${EMERALD}40` }} />
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: `${EMERALD}80` }}>
                  Formation
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full" style={{ background: `${EMERALD}26` }} />
              <div className="h-1.5 w-3/5 rounded-full" style={{ background: `${EMERALD}1a` }} />
            </div>
          </div>

          {/* ligne de scan animée : montée seulement pendant le balayage,
              puis démontée pour ne pas rester figée à l'écran */}
          {sweeping && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-16"
              style={{
                background: `linear-gradient(to bottom, transparent, ${EMERALD}33, transparent)`,
                animation: "scanSweep 2.1s ease-in-out 1",
              }}
            />
          )}
        </div>

        {/* pied : score ATS (jauge circulaire) + coches — sans-serif, pas de mono */}
        <div className="border-t px-5 py-4" style={{ borderColor: MINT, background: MINT }}>
          <div className="mb-3 flex items-center gap-4">
            <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90 flex-shrink-0" aria-hidden>
              <circle cx="26" cy="26" r="22" fill="none" stroke={EMERALD} strokeOpacity="0.15" strokeWidth="5" />
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke={EMERALD}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - (started ? score : 0) / 8)}
                style={{ transition: "stroke-dashoffset 120ms linear" }}
              />
            </svg>
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] mb-0.5" style={{ color: `${INK}66` }}>
                Contrôle de l&apos;éditeur
              </span>
              <span className="text-2xl font-bold tabular-nums font-['Space_Grotesk']" style={{ color: EMERALD }}>
                {started ? score : 0} points
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CHECKS.map((c, i) => (
              <span
                key={c.label}
                className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition-all duration-300"
                style={
                  checked[i]
                    ? { borderColor: `${EMERALD}66`, background: "white", color: EMERALD, opacity: 1 }
                    : { borderColor: `${INK}20`, color: `${INK}4d`, opacity: 0.7 }
                }
              >
                <Check size={11} className={checked[i] ? "opacity-100" : "opacity-0"} />
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scanSweep {
          0% {
            transform: translateY(-70px);
          }
          100% {
            transform: translateY(260px);
          }
        }
      `}</style>
    </div>
  );
}
