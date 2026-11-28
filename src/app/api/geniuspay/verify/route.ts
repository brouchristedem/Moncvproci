import { NextRequest, NextResponse } from "next/server";
import { GP_BASE, offerFromAmount, gpHeaders } from "@/lib/geniuspayServer";

// Vérifie auprès de GeniusPay (avec la clé secrète) qu'un paiement est bien
// terminé. Le navigateur ne peut donc pas "déclarer" un paiement lui-même.
export async function GET(req: NextRequest) {
  const headers = gpHeaders();
  if (!headers) return NextResponse.json({ error: "Paiement non configuré." }, { status: 503 });

  const reference = req.nextUrl.searchParams.get("reference") || "";
  // Références réelles (MTX-...) et références du mode test (SANDBOX_...).
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(reference)) {
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
    // L'offre se déduit du montant réellement payé (prix distincts).
    const offer = offerFromAmount(amount);
    return NextResponse.json({
      status: d.status as string,
      paid: d.status === "completed" && offer != null,
      offer: offer ? offer.id : null,
      amount,
      userId: d.metadata?.user_id ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Erreur réseau." }, { status: 500 });
  }
}
