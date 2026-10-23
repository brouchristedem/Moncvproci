"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { UI } from "@/lib/i18n";
import type { CinetPayPlan } from "@/lib/pricing";

// Bouton de paiement CinetPay : demande au serveur de créer la commande
// (le montant est recalculé côté serveur à partir de l'offre), puis envoie la
// personne sur la page de paiement sécurisée. Le déblocage du téléchargement
// se fait au retour, une fois le paiement vérifié par le serveur.
export default function CinetPayButton({
  t,
  langue,
  plan,
  price,
}: {
  t: (typeof UI)["fr"] | (typeof UI)["en"];
  langue: "fr" | "en";
  plan: CinetPayPlan;
  price: number;
}) {
  const { user, paymentReturn } = useAuth();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (!user || starting) return;
    setError("");
    setStarting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/cinetpay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan, lang: langue }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.paymentUrl) {
        setError(data?.error || t.genericError);
        setStarting(false);
        return;
      }
      window.location.assign(data.paymentUrl);
    } catch {
      setError(t.genericError);
      setStarting(false);
    }
  };

  return (
    <div className="space-y-2">
      {paymentReturn === "checking" && (
        <p className="flex items-center gap-2 text-xs text-foreground/70">
          <Loader2 className="animate-spin" size={14} /> {t.cinetpayChecking}
        </p>
      )}
      {paymentReturn === "pending" && <p className="text-xs text-amber-600">{t.cinetpayPending}</p>}
      {paymentReturn === "failed" && <p className="text-xs text-red-500">{t.cinetpayFailed}</p>}

      <button
        onClick={start}
        disabled={starting || paymentReturn === "checking"}
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 text-sm transition disabled:opacity-60"
      >
        {starting ? (
          <>
            <Loader2 className="animate-spin" size={14} /> {t.cinetpayStarting}
          </>
        ) : (
          <>
            {t.payCinetpay} {price} FCFA {t.payCinetpaySuffix} <ExternalLink size={14} />
          </>
        )}
      </button>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
