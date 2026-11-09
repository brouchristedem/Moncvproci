"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import { useCVStore, defaultCV, mergeWithDefaults } from "./store";
import { CVData } from "./types";
import { PASS_MS } from "./pricing";

const GUEST_DRAFT_KEY = "cvpro_guest_draft";

function loadGuestDraft(): CVData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CVData;
  } catch {
    return null;
  }
}

const VISITOR_ID_KEY = "cvpro_visitor_id";

function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(VISITOR_ID_KEY);
  } catch {
    return null;
  }
}

// Compte les invités (sans compte) qui ont réellement commencé un CV : un seul
// petit document anonyme par navigateur, sans aucune donnée personnelle.
function registerVisitor() {
  if (typeof window === "undefined" || getVisitorId()) return;
  try {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, id);
    void setDoc(doc(db, "visitors", id), { createdAt: serverTimestamp() }).catch(() => {});
  } catch {
    // non bloquant
  }
}

export function saveGuestDraft(cv: CVData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(cv));
    if (hasRealContent(cv)) registerVisitor();
  } catch {
    // stockage local indisponible (navigation privée, quota...) : non bloquant
  }
}

function clearGuestDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_DRAFT_KEY);
  } catch {
    // non bloquant
  }
}

// Un brouillon invité est considéré "utile" seulement s'il contient un
// minimum de contenu réel, pour éviter d'écraser un profil existant avec un
// brouillon vide.
function hasRealContent(cv: CVData): boolean {
  const p = cv.personalInfo;
  if (p.prenom.trim() || p.nom.trim() || p.titre.trim() || p.email.trim()) return true;
  return cv.sections.some((s) => s.items.some((it) => (it.titre || "").trim() || (it.description || "").trim()));
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isFreeDownloadTester: boolean;
  downloadsUsed: number;
  paidUnlocked: boolean;
  // Fin du Pass Candidature (ms depuis 1970) ; 0 = aucun pass acheté.
  paidUntil: number;
  usedPromoCodes: string[];
  authError: string;
  loadError: string;
  debugInfo: string;
  dataLoaded: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProgress: (cv: CVData) => Promise<void>;
  incrementDownloads: () => Promise<void>;
  confirmPaidDownload: (paymentReference: string, info?: { pack: boolean; amount: number }) => Promise<void>;
  applyPromoCode: (code: string) => Promise<void>;
  confirmPromoUsage: (code: string) => Promise<void>;
  resetMyUsedPromoCodes: () => Promise<void>;
  logDownload: (source: "paid" | "promo" | "admin") => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "brouchristedem@gmail.com"
).toLowerCase();
// Compte de test dédié : accès au téléchargement gratuit, sans les droits
// d'administration (pas d'accès au panneau /admin, pas d'impact sur les
// statistiques admin en dehors du log de téléchargement).
const FREE_DOWNLOAD_TEST_EMAIL = "moncvpro@gmail.com";

// Traduit les codes d'erreur Firebase Auth en messages compréhensibles en français.
function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet email. Essayez de vous connecter à la place, ou utilisez \"Mot de passe oublié\".";
    case "auth/invalid-email":
      return "Cette adresse email n'est pas valide.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email ou mot de passe incorrect.";
    case "auth/user-not-found":
      return "Aucun compte trouvé avec cet email. Créez un compte d'abord.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessayez dans quelques minutes.";
    default: {
      const message = err instanceof Error ? err.message : String(err);
      return message;
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadsUsed, setDownloadsUsed] = useState(0);
  // Pass Candidature : accès illimité jusqu'à paidUntil. "legacyUnlock" garde
  // le comportement des anciens paiements (un seul téléchargement) pour les
  // comptes qui avaient déjà payé avant le Pass.
  const [paidUntil, setPaidUntil] = useState(0);
  const [legacyUnlock, setLegacyUnlock] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const paidUnlocked = legacyUnlock || paidUntil > now;
  const [usedPromoCodes, setUsedPromoCodes] = useState<string[]>([]);
  const [authError, setAuthError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const reset = useCVStore((s) => s.reset);

  useEffect(() => {
    // Récupère le résultat d'une éventuelle redirection Google en cours,
    // pour éviter de rester bloqué si l'utilisateur revient d'un rechargement.
    getRedirectResult(auth).catch((err) => {
      console.error("Erreur de redirection Google:", err);
      setAuthError(err?.message || String(err));
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        setLoadError("");
        setDataLoaded(false);
        // Repart de zéro à chaque changement de compte : le pass d'un compte
        // ne doit jamais rester actif pour le suivant.
        setPaidUntil(0);
        setLegacyUnlock(false);
        if (u) {
          setDebugInfo(`uid=${u.uid.slice(0, 8)}... | lecture en cours...`);
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);
          const guestDraft = loadGuestDraft();
          const guestHasContent = guestDraft ? hasRealContent(guestDraft) : false;

          if (snap.exists()) {
            const data = snap.data();
            const merged = guestHasContent
              ? mergeWithDefaults(guestDraft as Partial<CVData>)
              : data.cv
                ? mergeWithDefaults(data.cv as Partial<CVData>)
                : null;
            if (merged) reset(merged);
            setDownloadsUsed(data.downloadsUsed || 0);
            const until = Number(data.paidUntil) || 0;
            setPaidUntil(until);
            setLegacyUnlock(!!data.paidUnlocked && !until);
            setNow(Date.now());
            setUsedPromoCodes(Array.isArray(data.usedPromoCodes) ? data.usedPromoCodes : []);
            if (guestHasContent) {
              // Le CV construit avant connexion prime : on l'enregistre tout
              // de suite sur le compte pour ne rien perdre.
              await setDoc(ref, { cv: merged, updatedAt: serverTimestamp() }, { merge: true });
              clearGuestDraft();
            }
            setDebugInfo(
              `uid=${u.uid.slice(0, 8)}... | document trouvé | téléchargements=${data.downloadsUsed || 0} | prénom sauvegardé="${merged?.personalInfo?.prenom || ""}"`
            );
          } else {
            const fresh = guestHasContent && guestDraft ? mergeWithDefaults(guestDraft) : defaultCV();
            await setDoc(ref, {
              email: u.email,
              displayName: u.displayName,
              downloadsUsed: 0,
              usedPromoCodes: [],
              cv: fresh,
              createdAt: serverTimestamp(),
            });
            reset(fresh);
            if (guestHasContent) clearGuestDraft();
            setDebugInfo(`uid=${u.uid.slice(0, 8)}... | AUCUN document trouvé, nouveau profil créé`);
          }
          const visitorId = getVisitorId();
          if (visitorId) {
            void setDoc(ref, { visitorId }, { merge: true }).catch(() => {});
          }
          setDataLoaded(true);
        } else {
          // Invité (non connecté) : on charge son brouillon local s'il existe,
          // pour lui permettre de construire et prévisualiser son CV sans
          // compte. Le téléchargement, lui, reste réservé aux comptes connectés.
          const guestDraft = loadGuestDraft();
          if (guestDraft) reset(mergeWithDefaults(guestDraft));
          setDataLoaded(true);
          setDebugInfo("Aucun utilisateur connecté (mode invité)");
        }
      } catch (err: unknown) {
        console.error("Erreur lors du chargement du profil:", err);
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [reset]);

  // Rafraîchit l'état au moment précis où le pass expire (page restée ouverte).
  useEffect(() => {
    const remaining = paidUntil - Date.now();
    if (remaining <= 0) return;
    const id = window.setTimeout(() => setNow(Date.now()), Math.min(remaining, 2 ** 31 - 1) + 500);
    return () => window.clearTimeout(id);
  }, [paidUntil]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      // Si la popup est bloquée, fermée, ou non supportée, on bascule sur la redirection.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    reset(defaultCV());
  }, [reset]);

  const saveProgress = useCallback(
    async (cv: CVData) => {
      if (!user) {
        throw new Error("Sauvegarde impossible : aucun utilisateur connecté (session perdue).");
      }
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, { cv, updatedAt: serverTimestamp() }, { merge: true });
    },
    [user]
  );

  // Enregistre chaque téléchargement réellement effectué (payant, promo
  // ou admin), pour permettre de compter le nombre total de CV téléchargés
  // côté admin — indépendamment de "downloadsUsed" qui ne suit que les
  // téléchargements payants (pour la tarification).
  // Non bloquant : une erreur ici ne doit jamais empêcher le téléchargement.
  const logDownload = useCallback(
    async (source: "paid" | "promo" | "admin") => {
      if (!user) return;
      try {
        await addDoc(collection(db, "downloads"), {
          userId: user.uid,
          email: user.email,
          source,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Erreur lors de l'enregistrement du téléchargement:", err);
      }
    },
    [user]
  );

  const incrementDownloads = useCallback(async () => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const next = downloadsUsed + 1;
    setDownloadsUsed(next);
    // Avec le Pass, un téléchargement ne consomme plus l'accès : seul le
    // compteur augmente. Les anciens paiements (1 téléchargement) restent
    // consommés après usage.
    if (legacyUnlock) {
      setLegacyUnlock(false);
      await setDoc(ref, { downloadsUsed: next, paidUnlocked: false }, { merge: true });
    } else {
      await setDoc(ref, { downloadsUsed: next }, { merge: true });
    }
  }, [user, downloadsUsed, legacyUnlock]);

  const confirmPaidDownload = useCallback(
    async (paymentReference: string, info?: { pack: boolean; amount: number }) => {
      if (!user) return;
      const existing = await getDocs(
        query(collection(db, "paymentClaims"), where("reference", "==", paymentReference))
      );
      if (!existing.empty) {
        throw new Error(
          "Ce paiement a déjà été utilisé pour un autre téléchargement."
        );
      }
      // Un nouveau paiement pendant un pass encore actif prolonge la durée.
      const until = Math.max(Date.now(), paidUntil) + PASS_MS;
      setPaidUntil(until);
      setLegacyUnlock(false);
      setNow(Date.now());
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        { paidUnlocked: true, paidUntil: until, lastPaymentReference: paymentReference },
        { merge: true }
      );
      try {
        await addDoc(collection(db, "paymentClaims"), {
          userId: user.uid,
          email: user.email,
          reference: paymentReference,
          // Type d'achat (CV seul ou Pack CV + lettre) et montant attendu, pour le suivi des ventes.
          ...(info ? { pack: info.pack, amount: info.amount } : {}),
          createdAt: serverTimestamp(),
        });
      } catch {
        // non bloquant
      }
    },
    [user, paidUntil]
  );

  // Valide un code promo (existe, actif, pas déjà utilisé par cette
  // personne) SANS le marquer comme utilisé. Le marquage définitif se fait
  // uniquement dans confirmPromoUsage, appelée après un téléchargement
  // réellement réussi (PDF ou Word) — pas au moment de la simple saisie du
  // code. Avant, un code était marqué "utilisé" dès son application, même
  // si le téléchargement qui suivait échouait ensuite (bug, coupure
  // réseau...) : la personne se retrouvait bloquée avec un code "déjà
  // utilisé" alors qu'elle n'avait jamais rien téléchargé avec.
  const applyPromoCode = useCallback(
    async (code: string) => {
      if (!user) throw new Error("Vous devez être connecté.");
      const trimmed = code.trim();
      if (!trimmed) throw new Error("Entrez un code promo.");
      const snap = await getDoc(doc(db, "promoCodes", trimmed));
      if (!snap.exists() || !snap.data().actif) {
        throw new Error("Code promo invalide ou expiré.");
      }
      // Seul un code à usage unique est limité à une utilisation. Un code
      // "illimité" reste réutilisable autant de fois qu'on veut, y compris
      // par la même personne.
      if (snap.data().usageType === "unique" && usedPromoCodes.includes(trimmed)) {
        throw new Error("Vous avez déjà utilisé ce code promo.");
      }
    },
    [user, usedPromoCodes]
  );

  // Marque un code promo comme réellement consommé, juste après un
  // téléchargement effectif. Pour un code à usage illimité, ça empêche
  // seulement CETTE personne de le réutiliser (d'autres personnes le
  // peuvent toujours). Pour un code à usage unique, le code est en plus
  // désactivé globalement pour tout le monde dès cette première
  // utilisation réussie.
  const confirmPromoUsage = useCallback(
    async (code: string) => {
      if (!user) return;
      const trimmed = code.trim();
      if (!trimmed) return;
      // On garde la liste (sans doublon) pour les stats admin ; elle ne
      // bloque plus la réutilisation d'un code illimité.
      if (!usedPromoCodes.includes(trimmed)) {
        const nextUsed = [...usedPromoCodes, trimmed];
        setUsedPromoCodes(nextUsed);
        const ref = doc(db, "users", user.uid);
        await setDoc(ref, { usedPromoCodes: nextUsed }, { merge: true });
      }
      try {
        const snap = await getDoc(doc(db, "promoCodes", trimmed));
        const usageType = snap.exists() ? snap.data().usageType : undefined;
        if (usageType === "unique") {
          await setDoc(
            doc(db, "promoCodes", trimmed),
            { actif: false, usedByUid: user.uid, usedAt: serverTimestamp() },
            { merge: true }
          );
        }
        // Notifie l'admin (Telegram) à chaque usage réel d'un code promo,
        // qu'il soit à usage unique ou illimité. Best-effort : n'importe quel
        // échec ici ne doit jamais remettre en cause le téléchargement, qui a
        // déjà eu lieu.
        fetch("/api/notify-promo-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed, usageType, email: user.email }),
        }).catch(() => {});
      } catch {
        // Non bloquant : le téléchargement a déjà eu lieu, on ne casse pas
        // l'expérience utilisateur si la désactivation du code échoue.
      }
    },
    [user, usedPromoCodes]
  );

  // Permet à un compte (typiquement l'admin, pour ses propres tests) de
  // vider la liste de ses codes promo déjà utilisés, afin de pouvoir
  // retester un même code sans avoir à passer par la console Firebase.
  const resetMyUsedPromoCodes = useCallback(async () => {
    if (!user) return;
    setUsedPromoCodes([]);
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, { usedPromoCodes: [] }, { merge: true });
  }, [user]);

  const isAdmin = !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;
  const isFreeDownloadTester =
    !!user?.email && user.email === FREE_DOWNLOAD_TEST_EMAIL;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isFreeDownloadTester,
        downloadsUsed,
        paidUnlocked,
        paidUntil,
        usedPromoCodes,
        authError,
        loadError,
        debugInfo,
        dataLoaded,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        signOut,
        saveProgress,
        incrementDownloads,
        confirmPaidDownload,
        applyPromoCode,
        confirmPromoUsage,
        resetMyUsedPromoCodes,
        logDownload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
