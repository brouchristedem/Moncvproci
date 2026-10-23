"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Undo2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useCVStore } from "@/lib/store";

export type AiKind = "profil" | "experience" | "formation" | "projets" | "lettre" | "autre";

const MESSAGES = {
  fr: {
    button: "Améliorer avec l'IA",
    working: "Amélioration…",
    undo: "Annuler",
    login: "Connecte-toi pour utiliser l'IA (gratuit).",
    short: "Écris d'abord quelques mots à améliorer.",
    long: "Texte trop long pour l'IA (1500 caractères max).",
    quota: "Limite du jour atteinte. Reviens demain.",
    unavailable: "L'IA est momentanément indisponible. Réessaie dans un instant.",
    notConfigured: "L'IA n'est pas encore activée.",
    remaining: (n: number) => `${n} restante${n > 1 ? "s" : ""} aujourd'hui`,
    privacy:
      "Le texte est envoyé à un service d'IA tiers, qui peut le conserver ou l'utiliser pour s'améliorer. N'y mettez pas d'infos sensibles.",
    privacyLink: "En savoir plus",
  },
  en: {
    button: "Improve with AI",
    working: "Improving…",
    undo: "Undo",
    login: "Sign in to use AI (free).",
    short: "Write a few words first.",
    long: "Text too long for AI (1500 characters max).",
    quota: "Daily limit reached. Come back tomorrow.",
    unavailable: "AI is temporarily unavailable. Try again shortly.",
    notConfigured: "AI is not enabled yet.",
    remaining: (n: number) => `${n} left today`,
    privacy:
      "The text is sent to a third-party AI service, which may store it or use it to improve its models. Don't include sensitive info.",
    privacyLink: "Learn more",
  },
};

export default function AiImproveButton({
  text,
  kind,
  titre,
  sousTitre,
  onResult,
}: {
  text: string;
  kind: AiKind;
  titre?: string;
  sousTitre?: string;
  onResult: (next: string) => void;
}) {
  const { user } = useAuth();
  const langue = useCVStore((s) => s.cv.langue);
  const m = MESSAGES[langue];
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  const run = async () => {
    setMessage(null);
    if (!user) {
      setMessage(m.login);
      return;
    }
    const plain = text.replace(/\*\*|__/g, "").trim();
    if (plain.length < 15) {
      setMessage(m.short);
      return;
    }
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ai-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ text: plain, kind, titre, sousTitre, langue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "auth_required") setMessage(m.login);
        else if (data.error === "too_short") setMessage(m.short);
        else if (data.error === "too_long") setMessage(m.long);
        else if (data.error === "quota_reached") setMessage(m.quota);
        else if (data.error === "not_configured") setMessage(m.notConfigured);
        else setMessage(m.unavailable);
        return;
      }
      setPrevious(text);
      onResult(data.text);
      setMessage(typeof data.remaining === "number" ? m.remaining(data.remaining) : null);
    } catch {
      setMessage(m.unavailable);
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (previous === null) return;
    onResult(previous);
    setPrevious(null);
    setMessage(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-2xl border border-brand-600 bg-brand-600/10 px-3 py-1.5 text-[11px] font-medium text-brand-600 transition hover:bg-brand-600/20 disabled:opacity-60"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {loading ? m.working : m.button}
      </button>
      {previous !== null && !loading && (
        <button
          type="button"
          onClick={undo}
          className="flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground"
        >
          <Undo2 size={12} /> {m.undo}
        </button>
      )}
      {message && <span className="text-[11px] text-foreground/60">{message}</span>}
      <p className="basis-full text-[10px] leading-snug text-foreground/45">
        {m.privacy}{" "}
        <Link href="/cgu#confidentialite" target="_blank" className="underline hover:text-foreground/70">
          {m.privacyLink}
        </Link>
      </p>
    </div>
  );
}
