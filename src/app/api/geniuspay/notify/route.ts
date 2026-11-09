import { NextRequest, NextResponse } from "next/server";
import { GP_BASE, GP_PRICE, GP_PRICE_PACK, gpHeaders } from "@/lib/geniuspayServer";

// Notification Telegram envoyée par le site lui-même, SANS dépendre du webhook
// GeniusPay (qui peut ne jamais partir en sandbox ou si l'URL/le secret ne sont
// pas configurés). Le navigateur envoie seulement la référence : le montant et
// le statut sont relus auprès de GeniusPay avec la clé secrète, donc personne
// ne peut déclencher une fausse notification de paiement.
const alreadyNotified = new Set<string>();

export async function POST(req: NextRequest) {
  const headers = gpHeaders();
  if (!headers) return NextResponse.json({ sent: false, reason: "geniuspay_not_configured" });

  try {
    const { reference } = await req.json();
    if (typeof reference !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(reference)) {
      return NextResponse.json({ sent: false, reason: "invalid_reference" }, { status: 400 });
    }
    if (alreadyNotified.has(reference)) {
      return NextResponse.json({ sent: false, reason: "already_notified" });
    }

    const res = await fetch(`${GP_BASE}/payments/${reference}`, { headers, cache: "no-store" });
    const json = await res.json().catch(() => null);
    const d = json?.data;
    if (!res.ok || !json?.success || !d) {
      return NextResponse.json({ sent: false, reason: "payment_not_found" });
    }
    const amount = Number(d.amount);
    if (d.status !== "completed" || (amount !== GP_PRICE && amount !== GP_PRICE_PACK)) {
      return NextResponse.json({ sent: false, reason: "payment_not_completed" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return NextResponse.json({ sent: false, reason: "telegram_not_configured" });
    }

    const isSandbox = reference.startsWith("SANDBOX_");
    const texte =
      `${isSandbox ? "🧪 TEST (sandbox) — " : "💰 "}Paiement reçu — MON CV PRO CI\n\n` +
      `💵 ${amount} FCFA${d.net_amount != null ? ` (net ${d.net_amount})` : ""}\n` +
      `📦 ${amount === GP_PRICE_PACK ? "Pack CV + lettre" : "CV seul"}\n` +
      `📲 ${d.provider || d.payment_method || d.gateway || "?"}\n` +
      `🧾 ${reference}`;

    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texte }),
    });
    if (!tg.ok) {
      const err = await tg.json().catch(() => null);
      return NextResponse.json({
        sent: false,
        reason: "telegram_error",
        detail: err?.description || `HTTP ${tg.status}`,
      });
    }
    alreadyNotified.add(reference);
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ sent: false, reason: "network_error" });
  }
}
