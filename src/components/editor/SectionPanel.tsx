"use client";

import { useEffect, useRef, useState } from "react";
import { useCVStore } from "@/lib/store";
import { EntryItem, Section } from "@/lib/types";
import { UI } from "@/lib/i18n";
import { parseRichRuns } from "@/lib/richText";
import { TEMPLATE_LIST } from "@/lib/templateRegistry";
import AiImproveButton, { AiKind } from "./AiImproveButton";
import { Trash2, Plus, Eye, EyeOff, Pencil, Bold, Underline, ArrowUp, ArrowDown, PanelLeft, AlignLeft, MoreVertical, Copy, RotateCcw } from "lucide-react";

// Doit rester synchronisé avec le SIDEBAR_TYPES de chaque modèle à 2
// colonnes (Template02/04/06/08/10/12/14) : sert uniquement à savoir quelle
// colonne un modèle choisirait par défaut pour une rubrique, tant que
// l'utilisateur n'a pas forcé de choix via colonne.
const DEFAULT_SIDEBAR_TYPES = new Set(["langues", "competences", "certifications", "interets", "references"]);

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Convertit le texte stocké (avec marqueurs **gras** / __souligné__) en
// HTML pour initialiser la zone éditable.
function markerTextToHtml(text: string): string {
  const runs = parseRichRuns(text);
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (runs.length === 0) return "";
  return runs
    .map((run) => {
      const escaped = escape(run.text).replace(/\n/g, "<br>");
      if (run.bold && run.underline) return `<strong><u>${escaped}</u></strong>`;
      if (run.bold) return `<strong>${escaped}</strong>`;
      if (run.underline) return `<u>${escaped}</u>`;
      return escaped;
    })
    .join("");
}

// Reconvertit le HTML de la zone éditable en texte avec marqueurs, pour
// le stockage (compatible avec l'aperçu et l'export PDF existants).
function htmlToMarkerText(root: Node): string {
  const runs: { text: string; bold: boolean; underline: boolean }[] = [];
  const collect = (node: Node, bold: boolean, underline: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) runs.push({ text, bold, underline });
      return;
    }
    if (node.nodeName === "BR") {
      runs.push({ text: "\n", bold: false, underline: false });
      return;
    }
    const el = node as HTMLElement;
    const nextBold = bold || el.tagName === "B" || el.tagName === "STRONG";
    const nextUnderline = underline || el.tagName === "U";
    node.childNodes.forEach((child) => collect(child, nextBold, nextUnderline));
    if (["DIV", "P"].includes(el.tagName) && node.nextSibling) {
      runs.push({ text: "\n", bold: false, underline: false });
    }
  };
  root.childNodes.forEach((child) => collect(child, false, false));

  let out = "";
  for (const run of runs) {
    const clean = run.text.replace(/\*\*/g, "").replace(/__/g, "");
    if (!clean) continue;
    if (run.bold && run.underline) out += `**__${clean}__**`;
    else if (run.bold) out += `**${clean}**`;
    else if (run.underline) out += `__${clean}__`;
    else out += clean;
  }
  return out;
}

function DescriptionField({
  value,
  placeholder,
  onChange,
  aiKind,
  aiTitre,
  aiSousTitre,
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  aiKind?: AiKind;
  aiTitre?: string;
  aiSousTitre?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [boldActive, setBoldActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);

  // Initialise le contenu une seule fois au montage (le composant est
  // remonté à chaque changement d'élément grâce à la clé posée sur son
  // parent) : on ne touche plus ensuite au DOM depuis React, pour ne pas
  // faire sauter la position du curseur pendant la frappe.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = markerTextToHtml(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncActiveState = () => {
    try {
      setBoldActive(document.queryCommandState("bold"));
      setUnderlineActive(document.queryCommandState("underline"));
    } catch {
      // Ignore : certains navigateurs peuvent lever une erreur hors focus.
    }
  };

  const handleInput = () => {
    if (ref.current) onChange(htmlToMarkerText(ref.current));
    syncActiveState();
  };

  const toggle = (command: "bold" | "underline") => {
    ref.current?.focus();
    document.execCommand(command);
    handleInput();
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Gras"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggle("bold")}
          className={`p-1.5 rounded border transition ${
            boldActive
              ? "border-brand-600 bg-brand-600/10 text-brand-600"
              : "border-border text-foreground/60 hover:text-foreground hover:bg-surface-muted"
          }`}
        >
          <Bold size={12} />
        </button>
        <button
          type="button"
          title="Souligné"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => toggle("underline")}
          className={`p-1.5 rounded border transition ${
            underlineActive
              ? "border-brand-600 bg-brand-600/10 text-brand-600"
              : "border-border text-foreground/60 hover:text-foreground hover:bg-surface-muted"
          }`}
        >
          <Underline size={12} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyUp={syncActiveState}
        onMouseUp={syncActiveState}
        onFocus={syncActiveState}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            document.execCommand("insertLineBreak");
            handleInput();
          }
        }}
        className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-xs outline-none overflow-y-auto max-h-60 min-h-[4.5rem] whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-foreground/30"
      />
      {aiKind && (
        <AiImproveButton
          text={value}
          kind={aiKind}
          titre={aiTitre}
          sousTitre={aiSousTitre}
          onResult={(next) => {
            // Le champ n'est plus réécrit par React après le montage : on
            // met donc à jour la zone éditable à la main, puis le store.
            if (ref.current) ref.current.innerHTML = markerTextToHtml(next);
            onChange(next);
          }}
        />
      )}
    </div>
  );
}

export default function SectionPanel({
  section,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  section: Section;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const cv = useCVStore((s) => s.cv);
  const set = useCVStore((s) => s.set);
  const removeSection = useCVStore((s) => s.removeSection);
  const duplicateSection = useCVStore((s) => s.duplicateSection);
  const resetSection = useCVStore((s) => s.resetSection);
  const [renaming, setRenaming] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = UI[cv.langue];

  // Ferme le menu "..." dès qu'on clique en dehors.
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const toggleVisible = () =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) => (s.id === section.id ? { ...s, visible: !s.visible } : s)),
    }));

  const renameSection = (titre: string) =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) => (s.id === section.id ? { ...s, titre } : s)),
    }));

  const setAffichage = (affichage: "liste" | "ligne") =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) => (s.id === section.id ? { ...s, affichage } : s)),
    }));

  const canToggleAffichage = ["langues", "competences", "interets"].includes(section.type);

  const addItem = () => {
    const newId = uid();
    set((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.id === section.id
          ? {
              ...s,
              items: [
                ...s.items,
                { id: newId, titre: "", sousTitre: "", description: "" } as EntryItem,
              ],
            }
          : s
      ),
    }));
    // Fait défiler jusqu'au nouvel élément dès qu'il est rendu, pour ne pas
    // laisser la personne chercher où il est apparu.
    requestAnimationFrame(() => {
      document.getElementById(`item-${newId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const updateItem = (itemId: string, patch: Partial<EntryItem>) =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.id === section.id
          ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
          : s
      ),
    }));

  const removeItem = (itemId: string) =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.id === section.id ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s
      ),
    }));

  // Permet de réordonner les entrées d'une rubrique (ex : mettre une
  // expérience avant une autre) sans avoir à réécrire leur contenu, en
  // échangeant simplement la position de deux entrées voisines dans le
  // tableau items.
  const moveItem = (itemId: string, direction: "up" | "down") =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) => {
        if (s.id !== section.id) return s;
        const idx = s.items.findIndex((it) => it.id === itemId);
        if (idx === -1) return s;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= s.items.length) return s;
        const items = [...s.items];
        [items[idx], items[targetIdx]] = [items[targetIdx], items[idx]];
        return { ...s, items };
      }),
    }));

  const isLangOrSkill = section.type === "langues" || section.type === "competences";
  const isJustTitle = section.type === "interets";
  const isSimpleText = section.type === "profil";

  const TITLE_LABEL: Partial<Record<string, { fr: string; en: string }>> = {
    experience: { fr: "Poste occupé (ex : Développeur Web)", en: "Job title (e.g. Web Developer)" },
    formation: { fr: "Diplôme / Formation", en: "Degree / Program" },
    projets: { fr: "Titre du projet", en: "Project title" },
    certifications: { fr: "Titre de la certification", en: "Certification title" },
  };
  const ORG_LABEL: Partial<Record<string, { fr: string; en: string }>> = {
    experience: { fr: "Entreprise", en: "Company" },
    formation: { fr: "École / Établissement", en: "School / Institution" },
    projets: { fr: "École / Cadre du projet", en: "School / Project context" },
    certifications: { fr: "Organisme émetteur", en: "Issuing organization" },
    references: { fr: "Entreprise / Contact", en: "Company / Contact" },
  };
  const SHOW_LIEU = section.type !== "certifications";

  const titlePlaceholder = isLangOrSkill
    ? t.itemLangSkillPlaceholder
    : TITLE_LABEL[section.type]
    ? TITLE_LABEL[section.type]![cv.langue]
    : t.itemTitlePlaceholder;
  const orgPlaceholder = ORG_LABEL[section.type]
    ? ORG_LABEL[section.type]![cv.langue]
    : t.itemOrgPlaceholder;

  const templateColonnes = TEMPLATE_LIST.find((tpl) => tpl.id === cv.templateId)?.colonnes ?? 1;
  const effectiveColonne: "lateral" | "principal" = section.colonne
    ? section.colonne
    : DEFAULT_SIDEBAR_TYPES.has(section.type)
    ? "lateral"
    : "principal";
  const setColonne = (colonne: "lateral" | "principal") =>
    set((c) => ({
      ...c,
      sections: c.sections.map((s) => (s.id === section.id ? { ...s, colonne } : s)),
    }));

  return (
    <div className="space-y-4">
      {(onMoveUp || onMoveDown) && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-muted px-3 py-2">
          <span className="text-[11px] text-foreground/50 flex-1">
            Position de cette rubrique sur le CV
          </span>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-2xl border border-border bg-surface text-foreground/70 hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-surface transition"
            title="Monter cette rubrique"
          >
            <ArrowUp size={14} /> Monter
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-2xl border border-border bg-surface text-foreground/70 hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-surface transition"
            title="Descendre cette rubrique"
          >
            <ArrowDown size={14} /> Descendre
          </button>
        </div>
      )}
      {templateColonnes === 2 && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-muted px-3 py-2">
          <span className="text-[11px] text-foreground/50 flex-1">
            Colonne (bandeau en haut sur mobile, à gauche sur ordi)
          </span>
          <button
            type="button"
            onClick={() => setColonne("lateral")}
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-2xl border transition ${
              effectiveColonne === "lateral"
                ? "border-brand-600 bg-brand-600/10 text-brand-600"
                : "border-border bg-surface text-foreground/70 hover:bg-surface-muted"
            }`}
            title="Placer dans le bandeau latéral"
          >
            <PanelLeft size={14} /> Bandeau
          </button>
          <button
            type="button"
            onClick={() => setColonne("principal")}
            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-2xl border transition ${
              effectiveColonne === "principal"
                ? "border-brand-600 bg-brand-600/10 text-brand-600"
                : "border-border bg-surface text-foreground/70 hover:bg-surface-muted"
            }`}
            title="Placer dans le contenu principal"
          >
            <AlignLeft size={14} /> Contenu principal
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        {renaming ? (
          <input
            autoFocus
            value={section.titre}
            onChange={(e) => renameSection(e.target.value)}
            onBlur={() => setRenaming(false)}
            onKeyDown={(e) => e.key === "Enter" && setRenaming(false)}
            className="flex-1 bg-transparent text-base font-semibold outline-none min-w-0 border-b border-brand-500"
          />
        ) : (
          <h3 className="flex-1 text-base font-semibold truncate">{section.titre}</h3>
        )}
        <button
          onClick={() => setRenaming((r) => !r)}
          className="text-foreground/40 hover:text-foreground/70 p-1.5 rounded-2xl hover:bg-surface-muted"
          title="Renommer"
        >
          <Pencil size={15} />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-foreground/40 hover:text-foreground/70 p-1.5 rounded-2xl hover:bg-surface-muted"
            title="Plus d'options"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl border border-border bg-surface shadow-lg z-20 py-1">
              <button
                onClick={() => {
                  toggleVisible();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-surface-muted"
              >
                {section.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                {section.visible ? "Masquer cette rubrique" : "Afficher cette rubrique"}
              </button>
              <button
                onClick={() => {
                  duplicateSection(section.id);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-surface-muted"
              >
                <Copy size={14} /> Dupliquer cette rubrique
              </button>
              <button
                onClick={() => {
                  if (section.items.length === 0) return;
                  if (window.confirm("Vider toutes les entrées de cette rubrique ? Le titre et les réglages sont conservés.")) {
                    resetSection(section.id);
                  }
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/80 hover:bg-surface-muted"
              >
                <RotateCcw size={14} /> Réinitialiser cette rubrique
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => removeSection(section.id)}
          className="text-red-400 hover:text-red-500 p-1.5 rounded-2xl hover:bg-red-500/10"
          title="Supprimer"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {canToggleAffichage && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-foreground/50">{t.display}</span>
          <button
            onClick={() => setAffichage("liste")}
            className={`text-[11px] px-2 py-1 rounded-2xl border transition ${
              (section.affichage || "liste") === "liste"
                ? "border-brand-600 text-brand-600 bg-brand-600/10"
                : "border-border"
            }`}
          >
            {t.displayList}
          </button>
          <button
            onClick={() => setAffichage("ligne")}
            className={`text-[11px] px-2 py-1 rounded-2xl border transition ${
              section.affichage === "ligne" ? "border-brand-600 text-brand-600 bg-brand-600/10" : "border-border"
            }`}
          >
            {t.displayInline}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {section.items.map((item, idx) => (
          <div key={item.id} id={`item-${item.id}`} className="rounded-2xl border border-border bg-surface p-3 space-y-2 relative">
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
              <button
                onClick={() => moveItem(item.id, "up")}
                disabled={idx === 0}
                title={cv.langue === "en" ? "Move up" : "Monter"}
                className="text-foreground/40 hover:text-foreground disabled:opacity-20 disabled:hover:text-foreground/40"
              >
                <ArrowUp size={14} />
              </button>
              <button
                onClick={() => moveItem(item.id, "down")}
                disabled={idx === section.items.length - 1}
                title={cv.langue === "en" ? "Move down" : "Descendre"}
                className="text-foreground/40 hover:text-foreground disabled:opacity-20 disabled:hover:text-foreground/40"
              >
                <ArrowDown size={14} />
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              placeholder={titlePlaceholder}
              value={item.titre}
              onChange={(e) => updateItem(item.id, { titre: e.target.value })}
              className="w-full bg-transparent text-sm font-medium outline-none border-b border-border pb-1.5 pr-16"
            />
            {isJustTitle ? null : isLangOrSkill ? (
              <input
                placeholder={t.itemLevelPlaceholder}
                value={item.niveau || ""}
                onChange={(e) => updateItem(item.id, { niveau: e.target.value })}
                className="w-full bg-transparent text-xs outline-none"
              />
            ) : isSimpleText ? (
              <DescriptionField
                placeholder={t.description}
                value={item.description || ""}
                onChange={(next) => updateItem(item.id, { description: next })}
                aiKind="profil"
                aiTitre={cv.personalInfo.titre}
              />
            ) : (
              <>
                <input
                  placeholder={orgPlaceholder}
                  value={item.sousTitre || ""}
                  onChange={(e) => updateItem(item.id, { sousTitre: e.target.value })}
                  className="w-full bg-transparent text-xs outline-none"
                />
                {SHOW_LIEU && (
                  <input
                    placeholder={cv.langue === "en" ? "Location" : "Lieu"}
                    value={item.lieu || ""}
                    onChange={(e) => updateItem(item.id, { lieu: e.target.value })}
                    className="w-full bg-transparent text-xs outline-none"
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-foreground/40 block mb-0.5">{t.dateStart}</label>
                    <input
                      type="month"
                      value={item.dateDebut || ""}
                      onChange={(e) => updateItem(item.id, { dateDebut: e.target.value })}
                      className="w-full bg-transparent text-xs outline-none border border-border rounded px-2 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-foreground/40 block mb-0.5">{t.dateEnd}</label>
                    <input
                      type="month"
                      value={item.dateFin || ""}
                      disabled={item.enCours}
                      onChange={(e) => updateItem(item.id, { dateFin: e.target.value })}
                      className="w-full bg-transparent text-xs outline-none border border-border rounded px-2 py-1 disabled:opacity-40"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-foreground/60">
                  <input
                    type="checkbox"
                    checked={!!item.enCours}
                    onChange={(e) => updateItem(item.id, { enCours: e.target.checked })}
                  />
                  {t.current}
                </label>
                <DescriptionField
                  placeholder={t.description}
                  value={item.description || ""}
                  onChange={(next) => updateItem(item.id, { description: next })}
                  aiKind={
                    section.type === "experience" || section.type === "formation" || section.type === "projets"
                      ? section.type
                      : "autre"
                  }
                  aiTitre={item.titre}
                  aiSousTitre={item.sousTitre}
                />
              </>
            )}
          </div>
        ))}
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
        >
          <Plus size={14} /> {t.addItem}
        </button>
      </div>
    </div>
  );
}
