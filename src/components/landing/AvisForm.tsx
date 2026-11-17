"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Star, Send, CheckCircle2 } from "lucide-react";

export default function AvisForm() {
  const [nom, setNom] = useState("");
  const [texte, setTexte] = useState("");
  const [note, setNote] = useState(5);
  const [hoverNote, setHoverNote] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    if (!nom.trim() || !texte.trim()) {
      setErreur("Merci de renseigner votre nom et votre avis.");
      return;
    }
    if (texte.trim().length > 500) {
      setErreur("Votre avis est un peu long (500 caractères maximum).");
      return;
    }
    setEnvoi(true);
    try {
      await addDoc(collection(db, "reviews"), {
        nom: nom.trim().slice(0, 60),
        texte: texte.trim().slice(0, 500),
        note,
        displayed: true,
        createdAt: serverTimestamp(),
      });
      setEnvoye(true);
      setNom("");
      setTexte("");
      setNote(5);
    } catch {
      setErreur("Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  if (envoye) {
    return (
      <div className="flex flex-col items-center text-center gap-2 rounded-2xl border border-brand-600/25 bg-brand-600/5 px-6 py-8">
        <CheckCircle2 className="text-brand-600" size={28} />
        <p className="font-semibold">Merci pour votre avis !</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNote(n)}
            onMouseEnter={() => setHoverNote(n)}
            onMouseLeave={() => setHoverNote(0)}
            className="p-0.5"
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          >
            <Star
              size={26}
              className={
                n <= (hoverNote || note)
                  ? "fill-accent-600 text-accent-600"
                  : "text-foreground/20"
              }
            />
          </button>
        ))}
      </div>

      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        placeholder="Votre nom (ex : Kouadio, Abidjan)"
        maxLength={60}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Votre avis sur MON CV PRO CI..."
        maxLength={500}
        rows={3}
        className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm resize-none"
      />

      {erreur && <p className="text-xs text-red-500">{erreur}</p>}

      <button
        type="submit"
        disabled={envoi}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-60"
      >
        {envoi ? "Envoi..." : "Envoyer mon avis"} <Send size={14} />
      </button>
    </form>
  );
}
