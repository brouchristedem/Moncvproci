"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vidéo de démonstration du hero : vraie capture d'écran de l'éditeur (pas de
 * faux aperçu). Pensée pour l'audience mobile / faible débit :
 *  - ne se télécharge que quand elle entre à l'écran (preload="none" + IntersectionObserver)
 *  - WebM (≈114 Ko) en priorité, MP4 (≈117 Ko) en secours pour Safari/iPhone
 *  - image "poster" affichée avant lecture et si l'utilisateur préfère moins d'animations
 */
export default function HeroDemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const video = ref.current;
    if (!video || mq.matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className="relative mx-auto w-[220px] sm:w-[260px] rounded-[2.25rem] border-[7px] overflow-hidden bg-white"
      style={{ borderColor: "rgba(255,255,255,0.92)", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.55)" }}
    >
      <video
        ref={ref}
        className="block w-full h-auto"
        width={390}
        height={844}
        poster="/videos/demo-editeur-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        aria-label="Démonstration : remplir son CV dans l'éditeur et voir l'aperçu en direct"
        controls={reduced}
      >
        <source src="/videos/demo-editeur.webm" type="video/webm" />
        <source src="/videos/demo-editeur.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
