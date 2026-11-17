"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Star, Quote } from "lucide-react";
import AvisForm from "./AvisForm";

interface Avis {
  id: string;
  nom: string;
  texte: string;
  note: number;
  createdAt: number;
}

function Stars({ note, size }: { note: number; size: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${note} sur 5 étoiles`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < note ? "fill-[#157A52] text-[#157A52]" : "text-[#1A2E28]/15"}
        />
      ))}
    </div>
  );
}

// Grande carte : quand il y a peu d'avis (3 ou moins).
function CarteGrande({ a }: { a: Avis }) {
  return (
    <div className="flex flex-col items-center text-center rounded-2xl border border-[#E3F0E9] bg-white p-6 shadow-[0_12px_28px_-16px_rgba(12,59,46,0.18)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E3F0E9] text-[#157A52] font-['Space_Grotesk'] font-bold text-sm mb-3">
        {a.nom.trim().charAt(0).toUpperCase()}
      </span>
      <div className="mb-3">
        <Stars note={a.note} size={13} />
      </div>
      <Quote className="text-[#157A52]/30 mb-2" size={18} aria-hidden />
      <p className="text-sm text-[#1A2E28]/75 leading-relaxed mb-3 max-w-[32ch]">{a.texte}</p>
      <p className="text-xs font-semibold text-[#1A2E28]/50">— {a.nom}</p>
    </div>
  );
}

// Petite carte : dès qu'il y a plus de 3 avis, pour garder la page courte.
function CartePetite({ a, className = "" }: { a: Avis; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E3F0E9] bg-white p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E3F0E9] text-[#157A52] font-['Space_Grotesk'] font-bold text-xs">
          {a.nom.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#1A2E28]/70 truncate">{a.nom}</p>
          <Stars note={a.note} size={10} />
        </div>
      </div>
      <p className="text-xs text-[#1A2E28]/70 leading-relaxed">{a.texte}</p>
    </div>
  );
}

export default function AvisSection() {
  const [avis, setAvis] = useState<Avis[]>([]);

  useEffect(() => {
    // Tous les avis sont affichés par défaut (displayed = true à l'envoi).
    // L'admin peut en masquer depuis /admin (displayed = false).
    const unsub = onSnapshot(
      query(collection(db, "reviews"), where("displayed", "==", true)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          nom: String(d.data().nom ?? ""),
          texte: String(d.data().texte ?? ""),
          note: Number(d.data().note ?? 5),
          createdAt: d.data().createdAt?.seconds ?? Number.MAX_SAFE_INTEGER, // en attente = tout récent
        }));
        // Plus récents d'abord (tri côté client : évite un index Firestore).
        list.sort((x, y) => y.createdAt - x.createdAt);
        setAvis(list);
      },
      () => setAvis([])
    );
    return () => unsub();
  }, []);

  // Densité : la taille diminue quand le nombre d'avis augmente.
  //  ≤ 3  : grandes cartes
  //  4–6  : petites cartes en grille
  //  > 6  : une seule rangée qu'on fait défiler (la hauteur de la page ne grandit plus)
  const n = avis.length;

  return (
    <div className="max-w-5xl mx-auto">
      {n > 0 && n <= 3 && (
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {avis.map((a) => (
            <CarteGrande key={a.id} a={a} />
          ))}
        </div>
      )}

      {n > 3 && n <= 6 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {avis.map((a) => (
            <CartePetite key={a.id} a={a} />
          ))}
        </div>
      )}

      {n > 6 && (
        <div className="mb-10">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
            {avis.map((a) => (
              <CartePetite key={a.id} a={a} className="snap-start shrink-0 w-[240px]" />
            ))}
          </div>
          <p className="text-center text-[11px] text-[#1A2E28]/40 mt-1">
            {n} avis — faites défiler →
          </p>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <p className="text-center text-sm font-semibold mb-3">Donnez votre avis</p>
        <AvisForm />
      </div>
    </div>
  );
}
