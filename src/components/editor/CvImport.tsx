"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileUp, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useCVStore } from "@/lib/store";
import { extractContacts, maskPersonalData } from "@/lib/personalData";
import { extractPdfText } from "@/lib/pdfText";
import { CVData, EntryItem, Section, SectionType, SECTION_LABELS_EN, SECTION_LABELS_FR } from "@/lib/types";

const MESSAGES = {
  fr: {
    title: "Importer un CV existant (PDF)",
    hint: "Remplit l'éditeur automatiquement à partir de ton ancien CV. Tu pourras tout corriger ensuite.",
    consent:
      "J'accepte que le contenu de mon CV (sans email ni téléphone) soit envoyé à un service d'IA tiers pour remplir l'éditeur.",
    more: "En savoir plus",
    button: "Choisir un PDF",
    reading: "Lecture du PDF…",
    analysing: "Analyse par l'IA… (10 à 30 secondes)",
    replace: "Ton CV actuel sera remplacé par le contenu importé (tu peux annuler ensuite avec le bouton Annuler de l'éditeur). Continuer ?",
    done: "CV importé. Relis chaque rubrique : l'IA peut se tromper.",
    login: "Connecte-toi pour utiliser l'import (gratuit).",
    notPdf: "Seuls les fichiers PDF sont acceptés.",
    tooBig: "Fichier trop volumineux (10 Mo max).",
    scan: "Impossible de lire le texte (PDF scanné ou image). Utilise un CV exporté depuis Word ou Google Docs.",
    long: "Ce CV est trop long à analyser. Essaie avec un PDF plus court (3 pages max).",
    quota: "Limite du jour atteinte. Reviens demain.",
    unavailable: "L'IA est momentanément indisponible. Réessaie dans un instant.",
    notConfigured: "L'import n'est pas encore activé.",
    error: "Une erreur est survenue. Réessaie avec un autre PDF.",
  },
  en: {
    title: "Import an existing CV (PDF)",
    hint: "Fills the editor automatically from your old CV. You can fix everything afterwards.",
    consent:
      "I agree that my CV content (without email or phone) is sent to a third-party AI service to fill the editor.",
    more: "Learn more",
    button: "Choose a PDF",
    reading: "Reading the PDF…",
    analysing: "AI analysis… (10 to 30 seconds)",
    replace: "Your current CV will be replaced by the imported content (you can undo with the editor's Undo button). Continue?",
    done: "CV imported. Review each section: the AI can make mistakes.",
    login: "Sign in to use the import (free).",
    notPdf: "Only PDF files are accepted.",
    tooBig: "File too large (10 MB max).",
    scan: "Can't read the text (scanned PDF or image). Use a CV exported from Word or Google Docs.",
    long: "This CV is too long to analyse. Try a shorter PDF (3 pages max).",
    quota: "Daily limit reached. Come back tomorrow.",
    unavailable: "AI is temporarily unavailable. Try again shortly.",
    notConfigured: "Import is not enabled yet.",
    error: "Something went wrong. Try another PDF.",
  },
};

interface Imported {
  prenom: string;
  nom: string;
  titre: string;
  adresse: string;
  profil: string;
  experience: Entry[];
  formation: Entry[];
  competences: { titre: string; niveau: string }[];
  langues: { titre: string; niveau: string }[];
  certifications: Entry[];
  projets: Entry[];
  interets: { titre: string }[];
}

interface Entry {
  titre: string;
  sousTitre: string;
  lieu: string;
  dateDebut: string;
  dateFin: string;
  enCours: boolean;
  description: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function entryItem(e: Entry): EntryItem {
  return {
    id: uid(),
    titre: e.titre,
    sousTitre: e.sousTitre || undefined,
    lieu: e.lieu || undefined,
    dateDebut: e.dateDebut || undefined,
    dateFin: e.enCours ? "" : e.dateFin || undefined,
    enCours: e.enCours || undefined,
    description: e.description || undefined,
  };
}

// Construit les entrées à remplir pour chaque type de rubrique. Un type absent
// de la liste n'est pas touché : on n'efface jamais une rubrique que l'IA n'a
// rien trouvé à remplir.
function itemsByType(d: Imported): Partial<Record<SectionType, EntryItem[]>> {
  const out: Partial<Record<SectionType, EntryItem[]>> = {};
  if (d.profil) out.profil = [{ id: uid(), titre: "", description: d.profil }];
  const entries: [SectionType, Entry[]][] = [
    ["experience", d.experience],
    ["formation", d.formation],
    ["certifications", d.certifications],
    ["projets", d.projets],
  ];
  for (const [type, list] of entries) {
    const items = list.filter((e) => e.titre).map(entryItem);
    if (items.length) out[type] = items;
  }
  for (const type of ["competences", "langues"] as const) {
    const items = d[type].filter((e) => e.titre).map((e) => ({ id: uid(), titre: e.titre, niveau: e.niveau || undefined }));
    if (items.length) out[type] = items;
  }
  const interets = d.interets.filter((e) => e.titre).map((e) => ({ id: uid(), titre: e.titre }));
  if (interets.length) out.interets = interets;
  return out;
}

function hasContent(cv: CVData): boolean {
  return !!cv.personalInfo.prenom || !!cv.personalInfo.nom || cv.sections.some((s) => s.items.length > 0);
}

export default function CvImport() {
  const { user } = useAuth();
  const cv = useCVStore((s) => s.cv);
  const set = useCVStore((s) => s.set);
  const langue = cv.langue;
  const m = MESSAGES[langue];

  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "reading" | "analysing">("idle");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const busy = phase !== "idle";

  const apply = (d: Imported, contacts: ReturnType<typeof extractContacts>) =>
    set((c) => {
      const pi = { ...c.personalInfo };
      if (d.prenom) pi.prenom = d.prenom;
      if (d.nom) pi.nom = d.nom;
      if (d.titre) pi.titre = d.titre;
      if (d.adresse) pi.adresse = d.adresse;
      if (contacts.email) pi.email = contacts.email;
      if (contacts.telephone) pi.telephone = contacts.telephone;
      if (contacts.linkedin) pi.linkedin = contacts.linkedin;
      if (contacts.siteWeb) pi.siteWeb = contacts.siteWeb;

      const byType = itemsByType(d);
      const labels = langue === "en" ? SECTION_LABELS_EN : SECTION_LABELS_FR;
      const sections: Section[] = c.sections.map((s) => {
        const items = byType[s.type];
        if (!items) return s;
        delete byType[s.type]; // une seule rubrique par type est remplie
        return { ...s, items };
      });
      // Rubrique manquante dans le CV actuel : on la crée pour ne rien perdre.
      for (const type of Object.keys(byType) as SectionType[]) {
        sections.push({
          id: uid(),
          type,
          titre: labels[type],
          visible: true,
          ordre: sections.length,
          items: byType[type]!,
          affichage: ["competences", "langues", "interets"].includes(type) ? "ligne" : undefined,
        });
      }
      return { ...c, personalInfo: pi, sections };
    });

  const run = async (file: File) => {
    setMessage(null);
    if (!user) return setMessage({ text: m.login, ok: false });
    if (file.type !== "application/pdf") return setMessage({ text: m.notPdf, ok: false });
    if (file.size > 10 * 1024 * 1024) return setMessage({ text: m.tooBig, ok: false });

    try {
      setPhase("reading");
      const raw = await extractPdfText(file);
      if (raw.length < 80) {
        setPhase("idle");
        return setMessage({ text: m.scan, ok: false });
      }
      if (raw.length > 12000) {
        setPhase("idle");
        return setMessage({ text: m.long, ok: false });
      }

      // Coordonnées retrouvées ici, dans le navigateur : elles ne partent pas vers l'IA.
      const contacts = extractContacts(raw);
      const safeText = maskPersonalData(raw);

      setPhase("analysing");
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ text: safeText }),
      });
      const json = await res.json().catch(() => ({}));
      setPhase("idle");

      if (!res.ok) {
        const map: Record<string, string> = {
          auth_required: m.login,
          too_short: m.scan,
          too_long: m.long,
          quota_reached: m.quota,
          not_configured: m.notConfigured,
        };
        return setMessage({ text: map[json.error] || m.unavailable, ok: false });
      }

      if (hasContent(useCVStore.getState().cv) && !window.confirm(m.replace)) return;
      apply(json.data as Imported, contacts);
      setMessage({ text: m.done, ok: true });
    } catch {
      setPhase("idle");
      setMessage({ text: m.error, ok: false });
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-brand-600/40 bg-brand-600/5 p-3 space-y-2.5">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileUp size={14} /> {m.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-foreground/60">{m.hint}</p>
      </div>

      <label className="flex items-start gap-2 text-[11px] text-foreground/70 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-brand-600"
        />
        <span>
          {m.consent}{" "}
          <Link href="/cgu#confidentialite" target="_blank" className="underline hover:text-foreground">
            {m.more}
          </Link>
        </span>
      </label>

      <button
        type="button"
        disabled={!consent || busy}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
        {phase === "reading" ? m.reading : phase === "analysing" ? m.analysing : m.button}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void run(file);
        }}
      />

      {message && <p className={`text-[11px] ${message.ok ? "text-green-600" : "text-red-500"}`}>{message.text}</p>}
    </div>
  );
}
