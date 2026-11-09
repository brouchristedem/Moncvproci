"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCVStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";
import { Download, Loader2, CheckCircle2, ExternalLink, AlertCircle, MessageCircle, Info, LogIn, Eye, Smartphone } from "lucide-react";
import { UI } from "@/lib/i18n";
import LettreMotivationForm from "./LettreMotivationForm";
import { isTwaContext } from "@/lib/isTwa";

// Prix unique pour tous les téléchargements, qu'il s'agisse du premier ou
// des suivants. Les montants viennent des variables d'environnement
// "NEXT" (CV seul) et "PACK" (CV + lettre de motivation assortie).
const PRICE = Number(process.env.NEXT_PUBLIC_PRICE_NEXT || 1000);
const PACK_PRICE = Number(process.env.NEXT_PUBLIC_PRICE_PACK || 1500);
// Paiement GeniusPay (Wave, Orange, MTN, Moov, carte) : le client est redirigé
// vers la page de paiement GeniusPay, puis le téléchargement se débloque tout
// seul à son retour (vérification côté serveur).
const GP_STORAGE_KEY = "gp_pending_reference";
const SUPPORT_WHATSAPP_NUMBER = "2250545177571"; // format international sans "+" ni espaces, pour le lien wa.me
const SUPPORT_PHONE_DISPLAY = "+225 05 45 17 75 71";

function PaymentFlow({
  t,
  langue,
  price,
  promoCode,
  setPromoCode,
  checkPromo,
  promoError,
  promoApplied,
  isTwa,
  gpLoading,
  onGeniusPay,
}: {
  t: (typeof UI)["fr"] | (typeof UI)["en"];
  langue: "fr" | "en";
  price: number;
  promoCode: string;
  setPromoCode: (v: string) => void;
  checkPromo: () => void;
  promoError: string;
  promoApplied: boolean;
  isTwa: boolean;
  gpLoading: boolean;
  onGeniusPay: () => void;
}) {
  const priceInfoText =
    langue === "en" ? `Downloading your CV costs ${price} FCFA.` : `Le téléchargement de votre CV coûte ${price} FCFA.`;

  return (
    <>
      <p className="text-xs text-foreground/60">{priceInfoText}</p>

      <div className="flex gap-2">
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder={t.promoCode}
          disabled={promoApplied}
          className="flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-sm outline-none disabled:opacity-60"
        />
        <button
          onClick={checkPromo}
          disabled={promoApplied}
          className="px-3 py-2 rounded-2xl border border-border text-sm hover:bg-surface-muted transition disabled:opacity-60"
        >
          {t.apply}
        </button>
      </div>
      {promoError && <p className="text-xs text-red-500">{promoError}</p>}
      {promoApplied && !promoError && (
        <p className="text-xs text-green-600">{t.promoAppliedSuccess}</p>
      )}

      <div className="rounded-2xl border border-border p-3 text-xs space-y-3">
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-amber-700">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{t.beforePayWarning}</span>
        </div>

        {isTwa && (
          <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-2.5 text-sky-700">
            <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
            <span>{t.twaPaymentNotice}</span>
          </div>
        )}

        <button
          onClick={onGeniusPay}
          disabled={gpLoading}
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 text-sm transition disabled:opacity-60"
        >
          {gpLoading ? <Loader2 className="animate-spin" size={16} /> : <ExternalLink size={14} />}
          {langue === "en" ? `Pay ${price} FCFA` : `Payer ${price} FCFA`}
        </button>

        <p className="text-[11px] text-foreground/60">
          {langue === "en"
            ? "Wave, Orange Money, MTN, Moov or card. Your download unlocks automatically after payment."
            : "Wave, Orange Money, MTN, Moov ou carte. Votre téléchargement se débloque automatiquement après le paiement."}
        </p>
      </div>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-foreground/50 flex items-center gap-1.5 hover:text-foreground/80 transition"
      >
        <MessageCircle size={12} /> {t.customerService} {SUPPORT_PHONE_DISPLAY}
      </a>
    </>
  );
}

export default function DownloadPanel({
  setWatermarkPrint,
}: {
  // Permet de faire apparaître le filigrane sur le portail d'impression
  // (détenu par la page éditeur) juste avant d'appeler window.print(), pour
  // le flux "Aperçu gratuit". Optionnel pour ne pas casser d'éventuels
  // autres usages du composant qui ne géreraient pas ce filigrane.
  setWatermarkPrint?: (v: boolean) => void;
}) {
  const {
    user,
    paidUnlocked,
    isAdmin,
    isFreeDownloadTester,
    incrementDownloads,
    confirmPaidDownload,
    applyPromoCode,
    confirmPromoUsage,
    logDownload,
  } = useAuth();
  const cv = useCVStore((s) => s.cv);
  const t = UI[cv.langue];
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isTwa, setIsTwa] = useState(false);
  const [gpLoading, setGpLoading] = useState(false);
  // État visible du paiement GeniusPay au retour du checkout.
  const [gpStatus, setGpStatus] = useState<"idle" | "checking" | "paid" | "pending" | "failed">("idle");
  const [gpCheckNonce, setGpCheckNonce] = useState(0);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    setIsIOSSafari(isIOS && isSafari);
    setIsTwa(isTwaContext());
  }, []);

  const canDownload =
    paidUnlocked || promoApplied || isAdmin || isFreeDownloadTester;
  const lettreActive = !!cv.lettreMotivation?.activee;
  const currentPrice = lettreActive ? PACK_PRICE : PRICE;

  // Journalisation du téléchargement PDF : compteur "CV téléchargés" +
  // décrément du palier de prix.
  const logDownloadOnce = async (source: "admin" | "promo" | "paid") => {
    try {
      if (paidUnlocked && !promoApplied && !isAdmin && !isFreeDownloadTester) {
        await incrementDownloads();
      }
      await logDownload(source);
      // Le code promo n'est marqué comme réellement consommé qu'ici, une
      // fois le téléchargement effectivement abouti — jamais au simple
      // moment où la personne l'a saisi et validé.
      if (source === "promo" && promoCode.trim()) {
        await confirmPromoUsage(promoCode);
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du téléchargement:", err);
    }
  };

  // Méthode de téléchargement, utilisée sur tous les navigateurs : la boîte
  // d'impression native du navigateur (window.print()), avec destination
  // "Enregistrer en PDF". Une tentative précédente générait le PDF côté
  // client (html2canvas) en recréant sa propre mise en page en JavaScript
  // plutôt que d'utiliser le moteur de rendu du navigateur ; cela produisait
  // des écarts invisibles à l'écran mais visibles une fois téléchargé
  // (icônes légèrement décalées, quelques pixels de texte dupliqués sur une
  // coupure de page, fond qui ne va pas jusqu'au bas de la page). En
  // utilisant l'impression native, le PDF est produit par le même moteur qui
  // affiche déjà correctement l'aperçu à l'écran : les deux sont donc
  // forcément identiques. La pagination (éviter de couper une rubrique ou
  // une entrée en plein milieu) est gérée par les règles CSS
  // "break-inside: avoid" déjà posées sur chaque bloc du CV.
  const downloadViaPrint = () => {
    if (typeof window === "undefined" || typeof window.print !== "function") {
      setDownloadError(t.printUnsupported);
      return;
    }

    setDownloadError("");
    let printThrew = false;
    try {
      window.print();
    } catch (err) {
      printThrew = true;
      console.error("Erreur window.print:", err);
      setDownloadError(t.downloadFailed);
    }
    if (printThrew) return;

    setGenerating(true);

    // La journalisation (compteur "CV téléchargés" + décrément du palier de
    // prix) se fait ICI, juste après l'appel à window.print(), et non plus
    // dans le callback de l'événement "afterprint". Sur de nombreux mobiles
    // (Chrome Android en particulier, et certains flux iOS "Enregistrer en
    // PDF" via le sélecteur natif), "afterprint" ne se déclenche jamais si
    // l'utilisateur ne passe pas par une impression papier classique — ce
    // qui faisait que le téléchargement avait bien lieu mais n'était jamais
    // comptabilisé côté admin. Du point de vue de l'utilisateur, l'action de
    // téléchargement est déjà déclenchée dès l'appel à print() ; on journalise
    // donc à ce moment-là, indépendamment de ce que fait ensuite le navigateur.
    let logged = false;
    const logOnce = async () => {
      if (logged) return;
      logged = true;
      // Seul un téléchargement réellement payé fait passer le tarif
      // au palier suivant. Un code promo ou un téléchargement admin ne doit
      // jamais compter comme "premier téléchargement consommé", sinon la
      // personne se retrouve à devoir payer 1000 FCFA dès son prochain
      // téléchargement alors qu'elle n'a encore rien payé.
      const source =
        isAdmin || isFreeDownloadTester
          ? "admin"
          : promoApplied
          ? "promo"
          : "paid";
      await logDownloadOnce(source);
    };
    void logOnce();

    // "afterprint" et le timeout ne servent plus qu'à réinitialiser l'UI
    // (spinner, champs), plus à décider si le téléchargement doit être compté.
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("afterprint", finish);
      setPromoApplied(false);
      setGenerating(false);
    };

    window.addEventListener("afterprint", finish);
    window.setTimeout(() => {
      if (!settled) {
        settled = true;
        window.removeEventListener("afterprint", finish);
        setGenerating(false);
      }
    }, 8000);
  };

  const proceedDownload = () => {
    downloadViaPrint();
  };

  // Flux "Aperçu gratuit / Test gratuit" : identique à un vrai téléchargement
  // (même impression native), mais avec le filigrane de sécurité activé sur
  // le portail d'impression, et sans aucune journalisation ni décompte —
  // ce n'est pas un vrai téléchargement payé, juste une prévisualisation
  // complète destinée à convaincre avant paiement.
  const downloadFreePreview = () => {
    if (typeof window === "undefined" || typeof window.print !== "function") {
      setDownloadError(t.printUnsupported);
      return;
    }
    setDownloadError("");
    setWatermarkPrint?.(true);

    // Deux frames pour laisser React re-rendre le portail d'impression avec
    // le filigrane avant d'ouvrir la boîte d'impression : sinon window.print()
    // risque de capturer l'état précédent (sans filigrane) selon le
    // navigateur.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          window.print();
        } catch (err) {
          console.error("Erreur window.print (aperçu gratuit):", err);
          setDownloadError(t.downloadFailed);
        }

        let settled = false;
        const reset = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener("afterprint", reset);
          setWatermarkPrint?.(false);
        };
        window.addEventListener("afterprint", reset);
        window.setTimeout(reset, 8000);
      });
    });
  };

  const checkPromo = async () => {
    setPromoError("");
    if (!promoCode.trim()) return;
    try {
      await applyPromoCode(promoCode);
      setPromoApplied(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.genericError;
      setPromoError(message);
    }
  };

  // --- GeniusPay : création du paiement puis redirection vers le checkout ---
  const startGeniusPay = async () => {
    if (!user) return;
    setUnlockError("");
    setGpLoading(true);
    try {
      const res = await fetch("/api/geniuspay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack: lettreActive,
          uid: user.uid,
          email: user.email,
          name: user.displayName || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || t.genericError);
      try {
        localStorage.setItem(GP_STORAGE_KEY, data.reference);
      } catch {}
      window.location.href = data.url;
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : t.genericError);
      setGpLoading(false);
    }
  };

  // Au retour du checkout (ou si la page est rouverte plus tard), on demande
  // au serveur si le paiement est terminé, puis on débloque le téléchargement.
  useEffect(() => {
    if (!user) return;
    let ref: string | null = null;
    try {
      ref = localStorage.getItem(GP_STORAGE_KEY);
    } catch {}
    if (!ref) return;
    let cancelled = false;
    let tries = 0;
    let timer: number | undefined;
    const check = async () => {
      tries++;
      setGpStatus((s) => (s === "paid" ? s : "checking"));
      try {
        const res = await fetch(`/api/geniuspay/verify?reference=${encodeURIComponent(ref!)}`, { cache: "no-store" });
        const d = await res.json();
        if (cancelled) return;
        // userId peut être absent en mode test : dans ce cas on se fie à la
        // référence stockée sur cet appareil (une référence = un seul compte,
        // déjà contrôlé dans confirmPaidDownload).
        if (d.paid && (d.userId == null || d.userId === user.uid)) {
          try {
            await confirmPaidDownload(ref!, { pack: d.pack, amount: d.amount });
            if (cancelled) return;
            setGpStatus("paid");
          } catch (err) {
            if (cancelled) return;
            setUnlockError(err instanceof Error ? err.message : t.genericError);
            setGpStatus("failed");
          }
          try {
            localStorage.removeItem(GP_STORAGE_KEY);
          } catch {}
          return;
        }
        if (d.status === "failed" || d.status === "cancelled" || d.status === "expired") {
          try {
            localStorage.removeItem(GP_STORAGE_KEY);
          } catch {}
          setGpStatus("failed");
          return;
        }
      } catch {}
      if (cancelled) return;
      if (tries < 40) {
        timer = window.setTimeout(check, 3000);
      } else {
        // ~2 minutes sans confirmation (ex. paiement Mobile Money non validé sur le
        // téléphone) : on arrête d'attendre et on propose de revérifier.
        setGpStatus("pending");
      }
    };
    timer = window.setTimeout(check, 0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, gpCheckNonce]);

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-foreground/60">
          {cv.langue === "en"
            ? "Your CV is ready. Log in to download it — nothing is lost, your work is already saved on this device."
            : "Votre CV est prêt. Connectez-vous pour le télécharger — rien n'est perdu, votre travail est déjà sauvegardé sur cet appareil."}
        </p>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 transition"
        >
          <LogIn size={18} />
          {cv.langue === "en" ? "Log in to download" : "Se connecter pour télécharger"}
        </Link>
        <p className="text-[11px] text-foreground/50 text-center">
          {cv.langue === "en" ? `Flat price: ${PRICE} FCFA` : `Prix unique : ${PRICE} FCFA`}
        </p>
      </div>
    );
  }

  const en = cv.langue === "en";

  return (
    <div className="space-y-3">
      {gpStatus === "checking" && (
        <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          <Loader2 className="animate-spin flex-shrink-0 mt-0.5" size={14} />
          <span>
            {en
              ? "Checking your payment… If your mobile money provider asks you to confirm on your phone, please do. This page updates by itself."
              : "Vérification de votre paiement… Si votre opérateur Mobile Money vous demande de confirmer sur votre téléphone, faites-le. Cette page se met à jour toute seule."}
          </span>
        </div>
      )}
      {gpStatus === "paid" && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="flex-shrink-0 mt-0.5" size={14} />
          <span className="font-medium">
            {en
              ? "Payment confirmed! Tap “Download” below to get your CV."
              : "Paiement confirmé ! Appuyez sur « Télécharger » ci-dessous pour récupérer votre CV."}
          </span>
        </div>
      )}
      {gpStatus === "pending" && (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="flex-shrink-0 mt-0.5" size={14} />
            <span>
              {en
                ? "Payment still pending. If you already paid, wait a moment then check again."
                : "Paiement toujours en attente. Si vous avez déjà payé, patientez un instant puis revérifiez."}
            </span>
          </div>
          <button
            onClick={() => setGpCheckNonce((n) => n + 1)}
            className="w-full rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 transition"
          >
            {en ? "Check again" : "Vérifier à nouveau"}
          </button>
        </div>
      )}
      {gpStatus === "failed" && !paidUnlocked && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={14} />
          <span>
            {en
              ? "Payment failed or cancelled. You can try again below."
              : "Paiement échoué ou annulé. Vous pouvez réessayer ci-dessous."}
          </span>
        </div>
      )}
      {canDownload && (
        <>
          <button
            onClick={() => proceedDownload()}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 transition disabled:opacity-60"
          >
            {generating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            {t.downloadCtaPdf}
          </button>
          {isIOSSafari && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>{t.iosPrintHint}</span>
            </div>
          )}
        </>
      )}
      {/* Sur le compte de test dédié au téléchargement gratuit, on garde
          également visible tout le reste du parcours (aperçu filigrane,
          formulaire pack CV + lettre, paiement, code promo) pour
          pouvoir continuer à tout tester depuis ce même compte. Pour les
          autres comptes (payant, promo, admin classique), ce bloc reste
          caché dès que canDownload est vrai, comme avant. */}
      {(!canDownload || isFreeDownloadTester) && (
        <>
          <LettreMotivationForm packPrice={PACK_PRICE} />
          <button
            onClick={downloadFreePreview}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-600 text-brand-600 hover:bg-brand-50 font-medium py-3 transition"
          >
            <Eye size={18} />
            {t.freePreviewCta}
          </button>
          <p className="text-[11px] text-foreground/50 -mt-1">{t.freePreviewInfo}</p>
          <div className="flex items-center gap-2 text-[11px] text-foreground/40">
            <div className="h-px flex-1 bg-border" />
            {t.freePreviewOr}
            <div className="h-px flex-1 bg-border" />
          </div>
          <PaymentFlow
            t={t}
            langue={cv.langue}
            price={currentPrice}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            checkPromo={checkPromo}
            promoError={promoError}
            promoApplied={promoApplied}
            isTwa={isTwa}
            gpLoading={gpLoading}
            onGeniusPay={startGeniusPay}
          />
        </>
      )}

      {(unlockError || downloadError) && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-300 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{unlockError || downloadError}</span>
        </div>
      )}
    </div>
  );
}
