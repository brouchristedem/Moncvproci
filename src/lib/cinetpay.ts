// Client CinetPay (serveur uniquement). Ne jamais importer ce fichier depuis
// un composant "use client" : il lit des identifiants secrets.
//
// Variables d'environnement :
//   CINETPAY_BASE_URL      ex. https://api.cinetpay.net (sandbox), sans "/v1" ni "/" final
//   CINETPAY_API_KEY       clé API du compte marchand
//   CINETPAY_API_PASSWORD  mot de passe API du compte marchand
import { createHash, timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

const baseUrl = () => (process.env.CINETPAY_BASE_URL || "").replace(/\/+$/, "");

export const PAYMENTS_COLLECTION = "cinetpayPayments";

// ---------- Jeton d'accès (mis en cache selon expires_in) ----------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  const res = await fetch(`${baseUrl()}/v1/oauth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.CINETPAY_API_KEY,
      api_password: process.env.CINETPAY_API_PASSWORD,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new Error(`CinetPay login refusé (${data?.status || res.status})`);
  }
  const ttl = Number(data.expires_in) || 300;
  // Marge de 60 s avant l'expiration réelle.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + Math.max(ttl - 60, 30) * 1000 };
  return cachedToken.token;
}

// Appel authentifié ; si le jeton est expiré/invalide, on en redemande un et on réessaie une fois.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any; // réponse JSON de CinetPay, lue champ par champ avec contrôles

async function authedFetch(path: string, init: RequestInit = {}): Promise<{ res: Response; data: Json }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getAccessToken(attempt > 0);
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    const expired = res.status === 401 || data?.code === 1002 || data?.code === 1003;
    if (!expired || attempt === 1) return { res, data };
  }
  throw new Error("unreachable");
}

// ---------- Création du paiement ----------

export interface InitPaymentInput {
  merchantTransactionId: string; // unique, 30 caractères maximum
  amount: number;
  designation: string;
  firstName: string;
  lastName: string;
  email: string;
  lang: "fr" | "en";
  successUrl: string;
  failedUrl: string;
  notifyUrl: string;
}

export async function initPayment(input: InitPaymentInput) {
  const { res, data } = await authedFetch("/v1/payment", {
    method: "POST",
    body: JSON.stringify({
      currency: "XOF",
      merchant_transaction_id: input.merchantTransactionId,
      amount: input.amount,
      lang: input.lang,
      designation: input.designation,
      client_email: input.email,
      client_first_name: input.firstName,
      client_last_name: input.lastName,
      success_url: input.successUrl,
      failed_url: input.failedUrl,
      notify_url: input.notifyUrl,
    }),
  });
  if (!res.ok || data?.code !== 200 || !data?.payment_url) {
    throw new Error(`CinetPay init refusé (${data?.status || res.status})`);
  }
  return {
    paymentUrl: String(data.payment_url),
    notifyToken: String(data.notify_token || ""),
    transactionId: String(data.transaction_id || ""),
  };
}

// ---------- Statut canonique (source de vérité) ----------

export async function getPaymentStatus(merchantTransactionId: string): Promise<{ code: number; status: string } | null> {
  const { res, data } = await authedFetch(`/v1/payment/${encodeURIComponent(merchantTransactionId)}`);
  if (!res.ok || typeof data?.status !== "string") return null;
  return { code: Number(data.code), status: data.status };
}

// ---------- Comparaison de jetons à temps constant ----------

export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ---------- Règlement d'un paiement (idempotent) ----------

export interface PaymentRecord {
  userId: string;
  email: string;
  plan: "cv" | "pack";
  amount: number;
  status: string; // CREATED | INITIATED | SUCCESS | FAILED | EXPIRED
  notifyToken?: string;
}

// Interroge CinetPay et, si (et seulement si) le statut canonique est SUCCESS,
// débloque le téléchargement de l'utilisateur. Appelable plusieurs fois
// (webhook en double, retour navigateur, relance) sans double déblocage.
export async function settlePayment(merchantTransactionId: string): Promise<{ status: string; paid: boolean } | null> {
  const db = adminDb();
  const ref = db.collection(PAYMENTS_COLLECTION).doc(merchantTransactionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const record = snap.data() as PaymentRecord;

  if (record.status === "SUCCESS") return { status: "SUCCESS", paid: true };

  const remote = await getPaymentStatus(merchantTransactionId);
  if (!remote) return { status: record.status, paid: false };

  if (remote.status === "SUCCESS") {
    let granted = false;
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists || (fresh.data() as PaymentRecord).status === "SUCCESS") return;
      tx.update(ref, { status: "SUCCESS", paidAt: FieldValue.serverTimestamp() });
      tx.set(
        db.collection("users").doc(record.userId),
        { paidUnlocked: true, lastCinetpayTransaction: merchantTransactionId },
        { merge: true }
      );
      granted = true;
    });
    if (granted) {
      await notifyAdmin(
        `💰 Paiement CinetPay réussi — MON CV PRO CI\n\n` +
          `📦 ${record.plan === "pack" ? "Pack CV + lettre" : "CV"} — ${record.amount} FCFA\n` +
          `👤 ${record.email || "email inconnu"}`
      );
    }
    return { status: "SUCCESS", paid: true };
  }

  const finalFailure = remote.status === "FAILED" || remote.status === "EXPIRED";
  if (finalFailure && record.status !== remote.status) {
    await ref.update({ status: remote.status });
  }
  return { status: remote.status, paid: false };
}

// ---------- Notification admin (Telegram), jamais bloquante ----------

export async function notifyAdmin(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // non bloquant
  }
}
