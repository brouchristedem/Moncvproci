"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mode de paiement actif, choisi par l'admin depuis /admin (document
// Firestore settings/payment, champ "mode"). Les règles existantes de
// /settings (lecture publique, écriture admin) suffisent : rien à republier.
//   - "geniuspay" : paiement en ligne GeniusPay (par défaut)
//   - "wave"      : paiement Wave classique + saisie de l'ID de transaction
export type PaymentMode = "geniuspay" | "wave";

export const PAYMENT_SETTINGS_PATH = ["settings", "payment"] as const;

// Lien Wave à montant fixe (celui du Pass). On retombe sur l'ancien lien "NEXT"
// s'il n'y a pas de lien dédié.
export const WAVE_LINK =
  process.env.NEXT_PUBLIC_WAVE_LINK_PACK || process.env.NEXT_PUBLIC_WAVE_LINK_NEXT || "";

// Format d'un ID de transaction Wave : T_ + 16 caractères.
export const isPlausibleWaveReference = (value: string) =>
  /^T_[A-Z0-9]{16}$/.test(value.trim().toUpperCase());

export function usePaymentMode(): PaymentMode {
  const [mode, setMode] = useState<PaymentMode>("geniuspay");
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, ...PAYMENT_SETTINGS_PATH),
      (snap) => setMode(snap.data()?.mode === "wave" ? "wave" : "geniuspay"),
      () => setMode("geniuspay")
    );
    return unsub;
  }, []);
  return mode;
}
