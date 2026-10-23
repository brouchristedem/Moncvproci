import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { PAYMENTS_COLLECTION, safeEqual, settlePayment, type PaymentRecord } from "@/lib/cinetpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CinetPay peut sonder l'URL en GET avant la première notification.
export async function GET() {
  return new NextResponse(null, { status: 200 });
}

// Webhook : le contenu reçu n'est qu'un SIGNAL. On vérifie le notify_token
// puis on redemande le statut réel à CinetPay avant de débloquer quoi que ce
// soit. On répond vite (200) et le traitement est idempotent.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const merchantTransactionId = typeof body?.merchant_transaction_id === "string" ? body.merchant_transaction_id : "";
    const notifyToken = typeof body?.notify_token === "string" ? body.notify_token : "";
    if (!merchantTransactionId || !notifyToken || merchantTransactionId.length > 30) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const snap = await adminDb().collection(PAYMENTS_COLLECTION).doc(merchantTransactionId).get();
    if (!snap.exists) {
      // Commande inconnue : on répond 200 pour éviter des relances inutiles.
      return NextResponse.json({ ok: true, ignored: true });
    }
    const record = snap.data() as PaymentRecord;

    if (!safeEqual(record.notifyToken || "", notifyToken)) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    await settlePayment(merchantTransactionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("CinetPay notify:", err instanceof Error ? err.message : err);
    // 500 => CinetPay réessaiera plus tard (back-off), ce qu'on veut en cas de panne.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
