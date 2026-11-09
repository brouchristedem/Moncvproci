import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
      const d = body.data || {};
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        const texte =
          `💰 Paiement reçu — MON CV PRO CI\n\n` +
          `💵 ${d.amount} FCFA (net ${d.net_amount ?? "?"})\n` +
          `📦 ${d.metadata?.pack === "1" ? "Pack CV + lettre" : "CV seul"}\n` +
          `📲 ${d.provider || d.payment_method || "?"}\n` +
          `🧾 ${d.reference}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: texte }),
        }).catch(() => null);
      }
    }
  } catch {
    // on répond toujours 200 une fois la signature valide
  }
  return NextResponse.json({ ok: true });
}
