import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { GP_BASE, gpHeaders } from "@/lib/geniuspayServer";

// Évite un doublon si GeniusPay renvoie le même webhook (retry).
const alreadyNotified = new Set<string>();

// Webhook GeniusPay : vérifie la signature HMAC-SHA256, puis prévient l'admin
// par Telegram à chaque paiement réussi. Ne modifie aucune donnée : l'accès
// au téléchargement est validé par /api/geniuspay/verify.
export async function POST(req: NextRequest) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ skipped: true });

  const raw = await req.text();
  const signature = req.headers.get("x-webhook-signature") || "";
  const timestamp = req.headers.get("x-webhook-timestamp") || "";

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return NextResponse.json({ error: "Timestamp too old" }, { status: 400 });
  }

  try {
    const body = JSON.parse(raw);
    if (body.event === "payment.success") {
      let d = body.data || {};
      const reference: string = d.reference || "";
      if (reference && alreadyNotified.has(reference)) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      // Le payload du webhook est parfois incomplet (surtout en sandbox) :
      // on relit le paiement auprès de GeniusPay pour avoir opérateur et net.
      const headers = gpHeaders();
      if (headers && reference) {
        const r = await fetch(`${GP_BASE}/payments/${encodeURIComponent(reference)}`, {
          headers,
          cache: "no-store",
        }).catch(() => null);
        const j = await r?.json().catch(() => null);
        if (j?.success && j.data) d = { ...d, ...j.data, metadata: j.data.metadata ?? d.metadata };
      }
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        const amount = Number(d.amount);
        const isSandbox = reference.startsWith("SANDBOX_") || body.environment === "sandbox";
        const texte =
          `${isSandbox ? "🧪 TEST (sandbox) — " : "💰 "}Paiement reçu — MON CV PRO CI\n\n` +
          `💵 ${amount} FCFA${d.net_amount != null ? ` (net ${Number(d.net_amount)})` : ""}\n` +
          `📦 Pass Candidature 5 jours\n` +
          `📲 ${d.provider || d.payment_method || d.gateway || "?"}\n` +
          `🧾 ${reference}`;
        const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: texte }),
        }).catch(() => null);
        if (tg?.ok && reference) alreadyNotified.add(reference);
      }
    }
  } catch {
    // on répond toujours 200 une fois la signature valide
  }
  return NextResponse.json({ ok: true });
}
