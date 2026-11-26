"use client";

import { useState } from "react";
import { useCVStore } from "@/lib/store";
import { FileText, ScanText, Undo2 } from "lucide-react";
import { parseLettre, ParsedLettre } from "@/lib/lettreParser";
import AiImproveButton from "./AiImproveButton";

const inputClass =
  "w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 transition";
const labelClass = "text-xs font-medium text-foreground mb-1 block";

// Bloc « Lettre de motivation » (incluse dans le Pass Candidature) : bascule + formulaire de la lettre de
// motivation, assortie au même design que le CV (voir LettreRenderer). Une
// fois activée, la lettre est automatiquement incluse comme 2e page dans
// tout téléchargement (payant ou aperçu gratuit filigrané), sans logique
// supplémentaire côté impression — voir CVPreviewFit.
export default function LettreMotivationForm() {
  const cv = useCVStore((s) => s.cv);
  const set = useCVStore((s) => s.set);
  const undo = useCVStore((s) => s.undo);
  const [recognized, setRecognized] = useState<string[] | null>(null);
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

  // Range chaque info d'une lettre collée entière dans son champ (lettre ou
  // infos personnelles) pour qu'elle ne soit pas dupliquée dans le corps.
  // Les infos personnelles du CV ne sont remplies que si elles sont vides.
  const applyParsed = (p: ParsedLettre, corps: string) => {
    const done: string[] = [];
    set((c) => {
      const pi = c.personalInfo;
      const cur = c.lettreMotivation || l;
      const fill = (v: string | undefined, next: string, label: string) => {
        if (v && v.trim()) return v;
        if (next) done.push(label);
        return next || v || "";
      };
      const pick = (v: string, next: string, label: string) => {
        if (next) {
          if (next !== v) done.push(label);
          return next;
        }
        return v;
      };
      return {
        ...c,
        personalInfo: {
          ...pi,
          prenom: fill(pi.prenom, p.prenom, isEn ? "first name" : "prénom"),
          nom: fill(pi.nom, p.nom, isEn ? "last name" : "nom"),
          email: fill(pi.email, p.email, "email"),
          telephone: fill(pi.telephone, p.telephone, isEn ? "phone" : "téléphone"),
          adresse: fill(pi.adresse, p.adresse, isEn ? "address" : "adresse"),
        },
        lettreMotivation: {
          ...cur,
          poste: pick(cur.poste, p.poste, isEn ? "position" : "poste"),
          entreprise: pick(cur.entreprise, p.entreprise, isEn ? "company" : "entreprise"),
          destinataire: pick(cur.destinataire, p.destinataire, isEn ? "recipient" : "destinataire"),
          ville: pick(cur.ville, p.ville, isEn ? "city" : "ville"),
          corps,
        },
      };
    });
    setRecognized(done);
  };

  const onPasteBody = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.length < 120) return; // petit extrait : collage normal
    const known = { prenom: cv.personalInfo.prenom, nom: cv.personalInfo.nom };
    const parsed = parseLettre(text, known);
    if (!parsed.detected) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const before = l.corps.slice(0, ta.selectionStart);
    const after = l.corps.slice(ta.selectionEnd);
    // Corps vide ou entièrement sélectionné : on remplace, sinon on insère au curseur.
    const corps = before.trim() || after.trim() ? `${before}${parsed.corps}${after}` : parsed.corps;
    applyParsed(parsed, corps);
  };

  const recognizeCurrent = () => {
    const known = { prenom: cv.personalInfo.prenom, nom: cv.personalInfo.nom };
    const parsed = parseLettre(l.corps, known);
    if (!parsed.detected) {
      setRecognized([]);
      return;
    }
    applyParsed(parsed, parsed.corps);
  };

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
            {isEn ? "Add a cover letter" : "Ajouter une lettre de motivation"}
          </span>
          <span className="block text-[11px] text-foreground/80 mt-0.5">
            {isEn
              ? "Included in your pass: a matching cover letter, same design as your CV."
              : "Incluse dans ton pass : une lettre assortie, même design que ton CV."}
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
              onPaste={onPasteBody}
              rows={8}
              placeholder={
                isEn
                  ? "Explain why you're a good fit for this position..."
                  : "Expliquez pourquoi vous êtes fait(e) pour ce poste..."
              }
              className={`${inputClass} resize-y`}
            />
            <p className="mt-1 text-[11px] text-foreground/70">
              {isEn
                ? "You can paste your whole letter: your details, recipient, subject and signature are detected and placed in the fields above."
                : "Tu peux coller ta lettre entière : tes infos, le destinataire, l'objet et la signature sont reconnus et rangés dans les champs."}
            </p>
            {recognized !== null && (
              <div className="mt-1.5 flex items-start gap-2 rounded-2xl bg-brand-600/10 px-3 py-2 text-[12px] text-foreground">
                <span className="flex-1">
                  {recognized.length > 0
                    ? (isEn ? "Letter recognized. Filled in: " : "Lettre reconnue. Champs remplis : ") + recognized.join(", ") + "."
                    : isEn
                      ? "Nothing new to detect (no “Dear Sir/Madam,” line found)."
                      : "Rien de nouveau à reconnaître (pas de ligne « Madame, Monsieur, » trouvée)."}
                </span>
                {recognized.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      undo();
                      setRecognized(null);
                    }}
                    className="flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-400 underline"
                  >
                    <Undo2 size={12} /> {isEn ? "Undo" : "Annuler"}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={recognizeCurrent}
              disabled={!l.corps.trim()}
              className="mt-1.5 flex items-center gap-1.5 rounded-2xl border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-surface-muted transition disabled:opacity-40"
            >
              <ScanText size={13} />
              {isEn ? "Detect my details in this text" : "Reconnaître mes infos dans ce texte"}
            </button>
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
          <p className="text-[11px] text-foreground/80">
            {isEn
              ? "Use the free preview below to see the full letter layout before paying."
              : "Utilisez l'aperçu gratuit ci-dessous pour voir la mise en page complète de la lettre avant de payer."}
          </p>
        </div>
      )}
    </div>
  );
}
