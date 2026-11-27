"use client";

import { useMemo, useState } from "react";
import { useCVStore } from "@/lib/store";
import { analyzeCvData } from "@/lib/atsEngine";
import { UI } from "@/lib/i18n";
import { ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, Circle, CircleDot, ArrowRight, Plus, Target } from "lucide-react";

// Même moteur que le scanner : le score de l'éditeur est celui qu'un ATS
// donnerait au CV tel qu'il sera exporté (champs, rubriques, dates, colonnes du modèle).
export default function ATSScore() {
  const cv = useCVStore((s) => s.cv);
  const setCv = useCVStore((s) => s.set);
  const t = UI[cv.langue];
  const isEn = cv.langue === "en";
  const [open, setOpen] = useState(false);
  const [jobText, setJobText] = useState("");
  const report = useMemo(() => analyzeCvData(cv, { jobText }), [cv, jobText]);
  const { percent, tier, criteria, groups, nextTip, keywords } = report;

  const barColor = tier === "excellent" ? "bg-green-500" : tier === "bon" ? "bg-brand-600" : "bg-amber-500";
  const tierLabel = tier === "excellent" ? t.atsExcellent : tier === "bon" ? t.atsBon : t.atsFaible;
  const tierTextColor = tier === "excellent" ? "text-green-600" : tier === "bon" ? "text-brand-600" : "text-amber-600";

  // Ajout d'un mot-clé de l'offre dans la rubrique Compétences — uniquement sur clic,
  // jamais automatiquement : la personne doit vraiment maîtriser la compétence.
  const addSkill = (term: string) => {
    setCv((c) => {
      const exists = c.sections.find((s) => s.type === "competences");
      const item = { id: `kw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, titre: term };
      if (exists) {
        return {
          ...c,
          sections: c.sections.map((s) => (s.id === exists.id ? { ...s, visible: true, items: [...s.items, item] } : s)),
        };
      }
      const ordre = Math.max(0, ...c.sections.map((s) => s.ordre)) + 1;
      return {
        ...c,
        sections: [
          ...c.sections,
          { id: `sec-${Date.now().toString(36)}`, type: "competences", titre: isEn ? "Skills" : "Compétences", visible: true, ordre, items: [item], affichage: "ligne" },
        ],
      };
    });
  };

  return (
    <div className="px-3 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/70">
          <ShieldCheck size={11} />
          {t.atsScore}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums">
          <span className={tierTextColor}>{tierLabel}</span>
          <span className="text-foreground/70">{percent}%</span>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      {open && (
        <div className="mt-2.5 pb-1 space-y-3">
          {nextTip && (
            <div className="flex items-start gap-2 rounded-2xl bg-accent-600/10 px-2.5 py-2">
              <ArrowRight size={13} className="flex-shrink-0 mt-0.5 text-accent-700" />
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-accent-700 mb-0.5">{t.atsNextImprovement}</p>
                <p className="text-[11px] text-foreground/80 leading-snug">{nextTip}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {groups.map((g) => (
              <div key={g.id}>
                <div className="flex justify-between text-[10px] text-foreground/80">
                  <span>{g.label}</span>
                  <span className="tabular-nums">{g.percent}%</span>
                </div>
                <div className="h-1 rounded-full bg-surface-muted overflow-hidden mt-0.5">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${g.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {criteria.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5 text-[11px]">
                {c.status === "ok" ? (
                  <CheckCircle2 size={13} className="flex-shrink-0 mt-px text-green-600" />
                ) : c.status === "partial" ? (
                  <CircleDot size={13} className="flex-shrink-0 mt-px text-amber-600" />
                ) : (
                  <Circle size={13} className="flex-shrink-0 mt-px text-red-500" />
                )}
                <span className="text-foreground">
                  {c.label}
                  <span className="text-foreground/70"> — {c.detail}</span>
                </span>
              </div>
            ))}
          </div>

          {!nextTip && (
            <p className="flex items-start gap-1.5 text-[11px] text-green-600">
              <ShieldCheck size={12} className="flex-shrink-0 mt-0.5" />
              {t.completenessDone}
            </p>
          )}

          <div className="rounded-2xl border border-border p-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/70 mb-1.5">
              <Target size={11} />
              {isEn ? "Match a job offer" : "Comparer à une offre"}
            </p>
            <textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              rows={3}
              placeholder={isEn ? "Paste the job ad here…" : "Collez le texte de l'offre ici…"}
              className="w-full rounded-xl border border-border bg-background px-2 py-1.5 text-[11px]"
            />
            {keywords && keywords.keywords.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] font-semibold mb-1.5">
                  {isEn ? "Match" : "Correspondance"} : <span className="tabular-nums">{keywords.matchPercent}%</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {keywords.present.map((k) => (
                    <span key={k.term} className="text-[10px] rounded-full px-2 py-0.5 border border-green-600/40 bg-green-600/10">
                      ✓ {k.term}
                    </span>
                  ))}
                  {keywords.missing.map((k) => (
                    <button
                      key={k.term}
                      onClick={() => addSkill(k.term)}
                      title={isEn ? "Add to Skills — only if you really have this skill" : "Ajouter aux Compétences — seulement si vous maîtrisez vraiment"}
                      className="flex items-center gap-0.5 text-[10px] rounded-full px-2 py-0.5 border border-amber-600/50 bg-amber-500/10 hover:bg-amber-500/20 transition"
                    >
                      <Plus size={10} /> {k.term}
                    </button>
                  ))}
                </div>
                {keywords.missing.length > 0 && (
                  <p className="text-[10px] text-foreground/70 mt-1.5">
                    {isEn
                      ? "Only add a keyword if you really have that skill."
                      : "N'ajoutez un mot-clé que si vous avez vraiment cette compétence."}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
