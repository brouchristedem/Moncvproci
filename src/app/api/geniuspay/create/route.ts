import { NextRequest, NextResponse } from "next/server";
import { GP_BASE, GP_PRICE, GP_PRICE_PACK, gpHeaders, siteUrl } from "@/lib/geniuspayServer";

// Crée un paiement GeniusPay et renvoie l'URL de la page de checkout
// (le client y choisit Wave, Orange, MTN, Moov ou carte).
export async function POST(req: NextRequest) {
  const headers = gpHeaders();
  if (!headers) {
    return NextResponse.json({ error: "Paiement non configuré." }, { status: 503 });
  }
  try {
    const { pack, uid, email, name } = await req.json();
    if (typeof uid !== "string" || !uid) {
      return NextResponse.json({ error: "Utilisateur manquant." }, { status: 400 });
    }
    const isPack = pack === true;
    const amount = isPack ? GP_PRICE_PACK : GP_PRICE;
    const base = siteUrl();

    const res = await fetch(`${GP_BASE}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        amount,
        currency: "XOF",
        description: isPack ? "MON CV PRO CI — Pack CV + lettre" : "MON CV PRO CI — Téléchargement CV",
        customer: {
          ...(typeof name === "string" && name ? { name: name.slice(0, 80) } : {}),
          ...(typeof email === "string" && email ? { email } : {}),
        },
        success_url: `${base}/editor?gp=success`,
        error_url: `${base}/editor?gp=error`,
        metadata: { user_id: uid, pack: isPack ? "1" : "0", site: "moncvproci" },
      }),
    });
    const json = await res.json().catch(() => null);
    const data = json?.data;
    if (!res.ok || !json?.success || !data?.reference || !(data.checkout_url || data.payment_url)) {
      return NextResponse.json(
        { error: json?.error?.message || "Impossible de démarrer le paiement." },
        { status: 502 }
      );
    }
    return NextResponse.json({
      reference: data.reference,
      url: data.checkout_url || data.payment_url,
    });
  } catch {
    return NextResponse.json({ error: "Erreur réseau." }, { status: 500 });
  }
}
