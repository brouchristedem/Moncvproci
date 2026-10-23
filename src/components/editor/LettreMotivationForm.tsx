"use client";

import { useCVStore } from "@/lib/store";
import { FileText } from "lucide-react";
import AiImproveButton from "./AiImproveButton";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 transition";
const labelClass = "text-xs font-medium text-foreground/70 mb-1 block";

// Bloc "Pack Candidature Complète" : bascule + formulaire de la lettre de
// motivation, assortie au même design que le CV (voir LettreRenderer). Une
// fois activée, la lettre est automatiquement incluse comme 2e page dans
// tout téléchargement (payant ou aperçu gratuit filigrané), sans logique
// supplémentaire côté impression — voir CVPreviewFit.
export default function LettreMotivationForm({ packPrice }: { packPrice: number }) {
  const cv = useCVStore((s) => s.cv);
  const set = useCVStore((s) => s.set);
  const isEn = cv.langue === "en";
  const l = cv.lettreMotivation || {
    activee: false,
    destinataire: "",
    entreprise: "",
    poste: "",
    ville: "",
    corps: "",
  };

  const updateLettre = (patch: Partial<typeof l>) =>
    set((c) => ({ ...c, lettreMotivation: { ...(c.lettreMotivation || l), ...patch } }));

  return (
    <div className="rounded-2xl border border-border p-3 space-y-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={l.activee}
          onChange={(e) => updateLettre({ activee: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-brand-600"
        />
        <span className="flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <FileText size={14} />
            {isEn ? "Full Application Pack" : "Pack Candidature Complète"}
          </span>
          <span className="block text-[11px] text-foreground/60 mt-0.5">
            {isEn
              ? `CV + matching cover letter, same design — ${packPrice} FCFA total.`
              : `CV + lettre de motivation assortie, même design — ${packPrice} FCFA au total.`}
          </span>
        </span>
      </label>

      {l.activee && (
        <div className="space-y-2.5 pt-1 border-t border-border">
          <div>
            <label className={labelClass}>{isEn ? "Position applied for" : "Poste visé"}</label>
            <input
              value={l.poste}
              onChange={(e) => updateLettre({ poste: e.target.value })}
              placeholder={isEn ? "e.g. Accountant" : "ex : Comptable"}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{isEn ? "Company" : "Entreprise"}</label>
            <input
              value={l.entreprise}
              onChange={(e) => updateLettre({ entreprise: e.target.value })}
              placeholder={isEn ? "e.g. Orange CI" : "ex : Orange CI"}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              {isEn ? "Recipient (optional)" : "Destinataire (optionnel)"}
            </label>
            <input
              value={l.destinataire}
              onChange={(e) => updateLettre({ destinataire: e.target.value })}
              placeholder={isEn ? "e.g. HR Manager" : "ex : Madame la Directrice des Ressources Humaines"}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{isEn ? "City (for the header)" : "Ville (pour l'en-tête)"}</label>
            <input
              value={l.ville}
              onChange={(e) => updateLettre({ ville: e.target.value })}
              placeholder={isEn ? "e.g. Abidjan" : "ex : Abidjan"}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{isEn ? "Letter body" : "Corps de la lettre"}</label>
            <textarea
              value={l.corps}
              onChange={(e) => updateLettre({ corps: e.target.value })}
              rows={8}
              placeholder={
                isEn
                  ? "Explain why you're a good fit for this position..."
                  : "Expliquez pourquoi vous êtes fait(e) pour ce poste..."
              }
              className={`${inputClass} resize-y`}
            />
            <div className="mt-1.5">
              <AiImproveButton
                text={l.corps}
                kind="lettre"
                titre={l.poste}
                sousTitre={l.entreprise}
                onResult={(next) => updateLettre({ corps: next })}
              />
            </div>
          </div>
          <p className="text-[11px] text-foreground/50">
            {isEn
              ? "Use the free preview below to see the full letter layout before paying."
              : "Utilisez l'aperçu gratuit ci-dessous pour voir la mise en page complète de la lettre avant de payer."}
          </p>
        </div>
      )}
    </div>
  );
}
