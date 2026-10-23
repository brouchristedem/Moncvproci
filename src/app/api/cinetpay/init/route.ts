import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";
import { initPayment, PAYMENTS_COLLECTION } from "@/lib/cinetpay";
import { CINETPAY_PRICES, isCinetPayPlan } from "@/lib/pricing";

export const runtime = "nodejs";

// Prénom / nom minimum 2 caractères chez CinetPay : on complète si besoin.
function splitName(displayName: string | undefined, email: string): { first: string; last: string } {
  const base = (displayName || email.split("@")[0] || "").replace(/[^\p{L}\s'-]/gu, " ").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const first = parts[0] && parts[0].length >= 2 ? parts[0] : "Client";
  const last = parts.slice(1).join(" ");
  return { first, last: last.length >= 2 ? last : "MonCVPro" };
}

export async function POST(req: NextRequest) {
  try {
    const idToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!idToken) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    const decoded = await verifyUser(idToken);
    if (!decoded) {
      return NextResponse.json({ error: "Session invalide, reconnectez-vous." }, { status: 401 });
    }

    const body: { plan?: unknown; lang?: unknown } = await req.json().catch(() => ({}));
    const rawPlan = body?.plan;
    if (!isCinetPayPlan(rawPlan)) {
      return NextResponse.json({ error: "Offre invalide." }, { status: 400 });
    }
    const plan = rawPlan;
    const lang: "fr" | "en" = body?.lang === "en" ? "en" : "fr";
    const email = decoded.email || "";
    if (!email) return NextResponse.json({ error: "Votre compte n'a pas d'adresse email." }, { status: 400 });

    // Le montant vient toujours du serveur, jamais du navigateur.
    const amount = CINETPAY_PRICES[plan];

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
    if (!siteUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Configuration du site incomplète." }, { status: 500 });
    }

    // Identifiant court (30 caractères max) et unique.
    const merchantTransactionId = `mc${randomUUID().replace(/-/g, "").slice(0, 24)}`;

    // On enregistre la commande AVANT d'envoyer le client payer.
    const ref = adminDb().collection(PAYMENTS_COLLECTION).doc(merchantTransactionId);
    await ref.set({
      userId: decoded.uid,
      email,
      plan,
      amount,
      status: "CREATED",
      createdAt: FieldValue.serverTimestamp(),
    });

    const { first, last } = splitName(decoded.name as string | undefined, email);

    try {
      const init = await initPayment({
        merchantTransactionId,
        amount,
        designation: plan === "pack" ? "MON CV PRO CI - Pack CV et lettre" : "MON CV PRO CI - Telechargement CV",
        firstName: first,
        lastName: last,
        email,
        lang,
        successUrl: `${siteUrl}/editor?cp=${merchantTransactionId}`,
        failedUrl: `${siteUrl}/editor?cpfail=1`,
        notifyUrl: `${siteUrl}/api/cinetpay/notify`,
      });
      await ref.update({
        status: "INITIATED",
        notifyToken: init.notifyToken,
        cinetpayTransactionId: init.transactionId,
      });
      return NextResponse.json({ paymentUrl: init.paymentUrl, merchantTransactionId });
    } catch (err) {
      console.error("CinetPay init:", err instanceof Error ? err.message : err);
      await ref.update({ status: "FAILED" }).catch(() => {});
      return NextResponse.json({ error: "Le paiement n'a pas pu démarrer. Réessayez dans un instant." }, { status: 502 });
    }
  } catch (err) {
    console.error("CinetPay init (erreur inattendue):", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Erreur inattendue. Réessayez." }, { status: 500 });
  }
}
