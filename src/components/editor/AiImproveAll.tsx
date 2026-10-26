"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useCVStore } from "@/lib/store";
import { SectionType } from "@/lib/types";

const MESSAGES = {
  fr: {
    title: "Améliorer tout mon CV avec l'IA",
    hint: "Réécrit d'un coup ton profil et les descriptions de tes expériences, formations et projets. Un seul clic compte pour 1 utilisation IA.",
    button: "Améliorer tout mon CV",
    working: "Amélioration en cours… (10 à 30 secondes)",
    nothing: "Écris d'abord quelques phrases dans ton profil ou tes descriptions (15 caractères minimum).",
    tooMany: "Trop de contenu pour une seule passe. Améliore tes rubriques une par une.",
    long: "Une description dépasse 1500 caractères. Raccourcis-la ou améliore-la seule.",
    login: "Connecte-toi pour utiliser l'IA (gratuit).",
    quota: "Limite du jour atteinte. Reviens demain.",
    unavailable: "L'IA est momentanément indisponible. Réessaie dans un instant.",
    notConfigured: "L'IA n'est pas encore activée.",
    done: (n: number, left: number | null) =>
      `${n} texte${n > 1 ? "s" : ""} amélioré${n > 1 ? "s" : ""}. Relis-les, l'IA peut se tromper. Bouton Annuler de l'éditeur pour revenir en arrière.${
        left !== null ? ` ${left} utilisation${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""} aujourd'hui.` : ""
      }`,
    privacy:
      "Les textes (sans nom, email ni téléphone) sont envoyés à un service d'IA tiers, qui peut les conserver ou les utiliser pour s'améliorer. N'y mettez pas d'infos sensibles.",
    privacyLink: "En savoir plus",
  },
  en: {
    title: "Improve my whole CV with AI",
    hint: "Rewrites your profile and the descriptions of your experience, education and projects in one go. One click counts as 1 AI use.",
    button: "Improve my whole CV",
    working: "Improving… (10 to 30 seconds)",
    nothing: "Write a few sentences in your profile or descriptions first (15 characters minimum).",
    tooMany: "Too much content for one pass. Improve your sections one by one.",
    long: "A description is over 1500 characters. Shorten it or improve it on its own.",
    login: "Sign in to use AI (free).",
    quota: "Daily limit reached. Come back tomorrow.",
    unavailable: "AI is temporarily unavailable. Try again shortly.",
    notConfigured: "AI is not enabled yet.",
    done: (n: number, left: number | null) =>
      `${n} text${n > 1 ? "s" : ""} improved. Please review them, the AI can make mistakes. Use the editor's Undo button to go back.${
        left !== null ? ` ${left} use${left > 1 ? "s" : ""} left today.` : ""
      }`,
    privacy:
      "Texts (without name, email or phone) are sent to a third-party AI service, which may store them or use them to improve its models. Don't include sensitive info.",
    privacyLink: "Learn more",
  },
};

const AI_TYPES: SectionType[] = ["profil", "experience", "formation", "projets"];
const MAX_ITEMS = 20;
const MAX_ITEM_CHARS = 1500;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function plainText(s: string | undefined): string {
  return (s || "").replace(/\*\*|__/g, "").trim();
}

export default function AiImproveAll() {
  const { user } = useAuth();
  const langue = useCVStore((s) => s.cv.langue);
  const set = useCVStore((s) => s.set);
  const m = MESSAGES[langue];
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const run = async () => {
    setMessage(null);
    if (!user) return setMessage({ text: m.login, ok: false });

    // Textes à améliorer, repérés par "sectionId:itemId" (l'id envoyé à l'IA est un simple numéro).
    const sent: { id: string; key: string; text: string }[] = [];
    const payload: { id: string; kind: SectionType; titre?: string; sousTitre?: string; text: string }[] = [];
    for (const s of useCVStore.getState().cv.sections) {
      if (!AI_TYPES.includes(s.type)) continue;
      for (const it of s.items) {
        const text = plainText(it.description);
        if (text.length < 15) continue;
        if (text.length > MAX_ITEM_CHARS) return setMessage({ text: m.long, ok: false });
        const id = String(payload.length);
        sent.push({ id, key: `${s.id}:${it.id}`, text: it.description || "" });
        payload.push({ id, kind: s.type, titre: it.titre || undefined, sousTitre: it.sousTitre || undefined, text });
      }
    }
    if (payload.length === 0) return setMessage({ text: m.nothing, ok: false });
    if (payload.length > MAX_ITEMS) return setMessage({ text: m.tooMany, ok: false });

    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ai-improve-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ items: payload, langue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const map: Record<string, string> = {
          auth_required: m.login,
          too_short: m.nothing,
          too_long: m.tooMany,
          quota_reached: m.quota,
          not_configured: m.notConfigured,
        };
        return setMessage({ text: map[data.error] || m.unavailable, ok: false });
      }

      const results = (data.results || {}) as Record<string, string>;
      const next = new Map<string, string>();
      for (const p of sent) {
        // On n'écrase pas un texte que l'utilisateur aurait modifié pendant l'attente.
        if (typeof results[p.id] === "string") next.set(p.key, results[p.id]);
      }

      let applied = 0;
      const originals = new Map(sent.map((p) => [p.key, p.text]));
      // Un seul set() : un seul clic sur Annuler remet tout le CV comme avant.
      set((c) => ({
        ...c,
        sections: c.sections.map((s) => ({
          ...s,
          items: s.items.map((it) => {
            const key = `${s.id}:${it.id}`;
            const improved = next.get(key);
            if (improved === undefined || (it.description || "") !== originals.get(key)) return it;
            applied++;
            // Nouvel id : force l'éditeur à réafficher le texte (champs non réécrits par React après montage).
            return { ...it, id: uid(), description: improved };
          }),
        })),
      }));

      setMessage({
        text: m.done(applied, typeof data.remaining === "number" ? data.remaining : null),
        ok: applied > 0,
      });
    } catch {
      setMessage({ text: m.unavailable, ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-brand-600/40 bg-brand-600/5 p-3 space-y-2.5">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles size={14} /> {m.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-foreground/60">{m.hint}</p>
      </div>
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
        {loading ? m.working : m.button}
      </button>
      {message && <p className={`text-[11px] ${message.ok ? "text-green-600" : "text-red-500"}`}>{message.text}</p>}
      <p className="text-[10px] leading-snug text-foreground/45">
        {m.privacy}{" "}
        <Link href="/cgu#confidentialite" target="_blank" className="underline hover:text-foreground/70">
          {m.privacyLink}
        </Link>
      </p>
    </div>
  );
}
