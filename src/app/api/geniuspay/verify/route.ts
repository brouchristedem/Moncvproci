import { NextRequest, NextResponse } from "next/server";
import { GP_BASE, GP_PRICE, GP_PRICE_PACK, gpHeaders } from "@/lib/geniuspayServer";

// Vérifie auprès de GeniusPay (avec la clé secrète) qu'un paiement est bien
// terminé. Le navigateur ne peut donc pas "déclarer" un paiement lui-même.
export async function GET(req: NextRequest) {
  const headers = gpHeaders();
  if (!headers) return NextResponse.json({ error: "Paiement non configuré." }, { status: 503 });

  const reference = req.nextUrl.searchParams.get("reference") || "";
  if (!/^MTX-[A-Z0-9]{6,}$/i.test(reference)) {
    return NextResponse.json({ error: "Référence invalide." }, { status: 400 });
  }
  try {
    const res = await fetch(`${GP_BASE}/payments/${reference}`, { headers, cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
    }
    const d = json.data;
    const amount = Number(d.amount);
    const okAmount = amount === GP_PRICE || amount === GP_PRICE_PACK;
    return NextResponse.json({
      status: d.status as string,
      paid: d.status === "completed" && okAmount,
      amount,
      pack: amount === GP_PRICE_PACK,
      userId: d.metadata?.user_id ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Erreur réseau." }, { status: 500 });
  }
}
