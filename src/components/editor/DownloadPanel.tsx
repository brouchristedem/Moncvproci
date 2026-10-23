"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCVStore } from "@/lib/store";
import { useAuth } from "@/lib/AuthContext";
import { Download, Loader2, CheckCircle2, ExternalLink, AlertCircle, MessageCircle, Info, LogIn, Eye, Smartphone } from "lucide-react";
import { UI } from "@/lib/i18n";
import LettreMotivationForm from "./LettreMotivationForm";
import CinetPayButton from "./CinetPayButton";
import { isTwaContext } from "@/lib/isTwa";
import { CINETPAY_PRICES, type CinetPayPlan } from "@/lib/pricing";

// Interrupteur du paiement CinetPay : tant qu'il n'est pas à "1" dans les
// variables d'environnement, le parcours Wave actuel reste inchangé. On peut
// l'activer d'abord uniquement sur les déploiements "Preview" pour tester en
// sandbox, puis sur "Production" le moment venu.
const CINETPAY_ON = process.env.NEXT_PUBLIC_CINETPAY_ENABLED === "1";

// Prix unique pour tous les téléchargements, qu'il s'agisse du premier ou
// des suivants. On réutilise volontairement les variables d'environnement
// "NEXT" existantes (déjà à 1000 FCFA côté Vercel) pour ne pas avoir à
// toucher à la configuration de déploiement.
const WAVE_LINK = process.env.NEXT_PUBLIC_WAVE_LINK_NEXT || "#";
const PRICE = Number(process.env.NEXT_PUBLIC_PRICE_NEXT || 1000);
// Pack "Candidature Complète" (CV + lettre de motivation assortie), à 1500
// FCFA. Nécessite en principe un lien Wave à montant fixe dédié
// (NEXT_PUBLIC_WAVE_LINK_PACK) puisque le lien Wave "simple" est verrouillé
// sur 1000 FCFA. Tant que ce lien n'est pas configuré côté Vercel, on
// retombe sur le lien standard pour ne jamais casser le paiement — mais le
// montant affiché sur le bouton ne correspondra alors pas au montant
// réellement demandé par Wave : Christ doit créer le lien dédié dès que
// possible.
const PACK_WAVE_LINK = process.env.NEXT_PUBLIC_WAVE_LINK_PACK || WAVE_LINK;
const PACK_PRICE = Number(process.env.NEXT_PUBLIC_PRICE_PACK || 1500);
const SUPPORT_WHATSAPP_NUMBER = "2250545177571"; // format international sans "+" ni espaces, pour le lien wa.me
const SUPPORT_PHONE_DISPLAY = "+225 05 45 17 75 71";

function PaymentFlow({
  t,
  langue,
  price,
  waveLink,
  promoCode,
  setPromoCode,
  checkPromo,
  promoError,
  promoApplied,
  waveClicked,
  setWaveClicked,
  waveReference,
  setWaveReference,
  confirming,
  handlePaidConfirmClick,
  confirmError,
  confirmSuccess,
  isTwa,
  cinetpay,
}: {
  t: (typeof UI)["fr"] | (typeof UI)["en"];
  langue: "fr" | "en";
  price: number;
  waveLink: string;
  promoCode: string;
  setPromoCode: (v: string) => void;
  checkPromo: () => void;
  promoError: string;
  promoApplied: boolean;
  waveClicked: boolean;
  setWaveClicked: (v: boolean) => void;
  waveReference: string;
  setWaveReference: (v: string) => void;
  confirming: boolean;
  handlePaidConfirmClick: () => void;
  confirmError?: string;
  confirmSuccess?: boolean;
  isTwa: boolean;
  cinetpay?: { plan: CinetPayPlan };
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
          <span>{cinetpay ? t.cinetpayBeforePay : t.beforePayWarning}</span>
        </div>

        {isTwa && (
          <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-2.5 text-sky-700">
            <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
            <span>{t.twaPaymentNotice}</span>
          </div>
        )}

        {cinetpay ? (
          <CinetPayButton t={t} langue={langue} plan={cinetpay.plan} price={price} />
        ) : (
        <>
        <a
          href={waveLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setWaveClicked(true)}
          className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#1DC8CD] hover:opacity-90 text-white font-semibold py-3 text-sm transition"
        >
          {t.payWithWave} {price} FCFA {t.payWithWaveSuffix} <ExternalLink size={14} />
        </a>

        {waveClicked && (
          <div className="space-y-2 pt-1 border-t border-border">
            <div>
              <label className="text-[11px] text-foreground/60 block mb-1">{t.waveReferenceLabel}</label>
              <input
                value={waveReference}
                onChange={(e) => setWaveReference(e.target.value)}
                placeholder={t.waveReferencePlaceholder}
                className="w-full rounded-2xl border border-border bg-surface px-2.5 py-1.5 text-xs outline-none"
              />
            </div>
            <p className="text-[11px] text-amber-600">{t.paidFlowWarning}</p>
            <button
              onClick={handlePaidConfirmClick}
              disabled={confirming}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 transition disabled:opacity-60"
            >
              {confirming ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
              {t.paidConfirm}
            </button>
            {confirmError && <p className="text-[11px] text-red-500">{confirmError}</p>}
            {confirmSuccess && (
              <p className="text-[11px] text-emerald-600 font-medium">Parcours validé avec succès.</p>
            )}
          </div>
        )}
        </>
        )}
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
  const [confirming, setConfirming] = useState(false);
  const [waveReference, setWaveReference] = useState("");
  const [waveClicked, setWaveClicked] = useState(false);
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isTwa, setIsTwa] = useState(false);

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
  const cinetpayPlan: CinetPayPlan = lettreActive ? "pack" : "cv";
  const currentPrice = CINETPAY_ON ? CINETPAY_PRICES[cinetpayPlan] : lettreActive ? PACK_PRICE : PRICE;
  const currentWaveLink = lettreActive ? PACK_WAVE_LINK : WAVE_LINK;

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
      // Seul un téléchargement réellement payé (Wave) fait passer le tarif
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
      setWaveClicked(false);
      setWaveReference("");
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

  const isPlausibleWaveReference = (value: string) => {
    const v = value.trim().toUpperCase();
    return /^T_[A-Z0-9]{16}$/.test(v);
  };

  const handlePaidConfirmClick = async () => {
    if (!user) return;
    setUnlockError("");
    if (!waveReference.trim()) {
      setUnlockError(t.waveReferenceRequired);
      return;
    }
    if (!isPlausibleWaveReference(waveReference)) {
      setUnlockError(t.waveReferenceInvalid);
      return;
    }
    setConfirming(true);
    try {
      await confirmPaidDownload(waveReference.trim());
    } catch (err: unknown) {
      console.error("Erreur de confirmation de paiement:", err);
      const message = err instanceof Error ? err.message : String(err);
      setUnlockError(message || t.genericError);
    } finally {
      setConfirming(false);
    }
  };

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
          {(() => {
            const shown = CINETPAY_ON ? CINETPAY_PRICES.cv : PRICE;
            return cv.langue === "en" ? `Flat price: ${shown} FCFA` : `Prix unique : ${shown} FCFA`;
          })()}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          formulaire pack CV + lettre, paiement Wave, code promo) pour
          pouvoir continuer à tout tester depuis ce même compte. Pour les
          autres comptes (payant, promo, admin classique), ce bloc reste
          caché dès que canDownload est vrai, comme avant. */}
      {(!canDownload || isFreeDownloadTester) && (
        <>
          <LettreMotivationForm packPrice={CINETPAY_ON ? CINETPAY_PRICES.pack : PACK_PRICE} />
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
            waveLink={currentWaveLink}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            checkPromo={checkPromo}
            promoError={promoError}
            promoApplied={promoApplied}
            waveClicked={waveClicked}
            setWaveClicked={setWaveClicked}
            waveReference={waveReference}
            setWaveReference={setWaveReference}
            confirming={confirming}
            handlePaidConfirmClick={handlePaidConfirmClick}
            isTwa={isTwa}
            cinetpay={CINETPAY_ON ? { plan: cinetpayPlan } : undefined}
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
