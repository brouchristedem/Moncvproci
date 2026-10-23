import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { PAYMENTS_COLLECTION, settlePayment, type PaymentRecord } from "@/lib/cinetpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Appelé par le navigateur au retour du paiement : filet de sécurité si le
// webhook arrive en retard. Vérifie auprès de CinetPay (même logique que le
// webhook) et ne répond que pour une commande appartenant à la personne connectée.
export async function GET(req: NextRequest) {
  try {
    const idToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!idToken) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });

    let uid: string;
    try {
      uid = (await adminAuth().verifyIdToken(idToken)).uid;
    } catch {
      return NextResponse.json({ error: "Session invalide." }, { status: 401 });
    }

    const tx = req.nextUrl.searchParams.get("tx") || "";
    if (!tx || tx.length > 30) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });

    const snap = await adminDb().collection(PAYMENTS_COLLECTION).doc(tx).get();
    if (!snap.exists || (snap.data() as PaymentRecord).userId !== uid) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const result = await settlePayment(tx);
    return NextResponse.json({ status: result?.status ?? "UNKNOWN", paid: !!result?.paid });
  } catch (err) {
    console.error("CinetPay status:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Vérification impossible pour le moment." }, { status: 500 });
  }
}
