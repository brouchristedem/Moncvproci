"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { TEMPLATE_LIST } from "@/lib/templateRegistry";
import AdminCVDownload from "@/components/admin/AdminCVDownload";
import { Trash2, Plus, Search, Users, Wallet, Star } from "lucide-react";

const PRICE = Number(process.env.NEXT_PUBLIC_PRICE_NEXT || 1000);

interface PromoCode {
  code: string;
  actif: boolean;
  usageType?: "unique" | "illimite";
}

interface PaymentClaim {
  id: string;
  email: string;
  reference?: string;
  /** Ancien champ (paiements Wave manuels d'avant Geniuspay) */
  waveReference?: string;
  createdAt?: { seconds: number };
}

interface Review {
  id: string;
  nom: string;
  texte: string;
  note: number;
  displayed: boolean;
  createdAt?: { seconds: number };
}

interface AdminStats {
  totalUsers: number;
  usersToday: number;
  topPromoCode: string | null;
  topPromoCodeCount: number;
  totalDownloads: number;
  totalRevenueFCFA: number;
}

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newCodeUsageType, setNewCodeUsageType] = useState<"unique" | "illimite">("illimite");
  const [templateStatus, setTemplateStatus] = useState<Record<string, boolean>>({});
  const [claims, setClaims] = useState<PaymentClaim[]>([]);
  const [claimSearch, setClaimSearch] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.replace("/");
  }, [loading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsubPromo = onSnapshot(collection(db, "promoCodes"), (snap) => {
      setPromoCodes(
        snap.docs.map((d) => ({
          code: d.id,
          actif: d.data().actif,
          usageType: d.data().usageType,
        }))
      );
    });
    const unsubClaims = onSnapshot(
      query(collection(db, "paymentClaims"), orderBy("createdAt", "desc"), limit(30)),
      (snap) => {
        setClaims(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PaymentClaim, "id">) })));
      }
    );
    const unsubReviews = onSnapshot(
      query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(100)),
      (snap) => {
        setReviews(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, "id">) })));
      }
    );
    const initial: Record<string, boolean> = {};
    TEMPLATE_LIST.forEach((t) => (initial[t.id] = t.actif));
    setTemplateStatus(initial);
    return () => {
      unsubPromo();
      unsubClaims();
      unsubReviews();
    };
  }, [isAdmin]);

  // Statistiques calculées à partir de l'ensemble des comptes utilisateurs.
  // Écoutées en temps réel (onSnapshot) sur les 3 collections concernées :
  // auparavant un simple getDocs ponctuel, ce qui figeait les compteurs
  // (notamment "CV téléchargés") jusqu'au prochain rechargement complet de
  // la page admin. Chaque snapshot recalcule l'ensemble des stats dès
  // qu'un document est ajouté/modifié dans users, downloads ou paymentClaims.
  useEffect(() => {
    if (!isAdmin) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usersDocs: any[] = [];
    let downloadsCount = 0;
    let claimsCount = 0;
    let usersLoaded = false;
    let downloadsLoaded = false;
    let claimsLoaded = false;

    const recompute = () => {
      if (!usersLoaded || !downloadsLoaded || !claimsLoaded) return;
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodaySeconds = startOfToday.getTime() / 1000;

      let usersToday = 0;
      const promoUsage: Record<string, number> = {};

      usersDocs.forEach((data: any) => {
        const createdAtSeconds: number | undefined = data.createdAt?.seconds;
        if (createdAtSeconds && createdAtSeconds >= startOfTodaySeconds) usersToday += 1;
        const used: string[] = Array.isArray(data.usedPromoCodes) ? data.usedPromoCodes : [];
        used.forEach((code) => {
          promoUsage[code] = (promoUsage[code] || 0) + 1;
        });
      });

      let topPromoCode: string | null = null;
      let topPromoCodeCount = 0;
      Object.entries(promoUsage).forEach(([code, count]) => {
        if (count > topPromoCodeCount) {
          topPromoCode = code;
          topPromoCodeCount = count;
        }
      });

      setStats({
        totalUsers: usersDocs.length,
        usersToday,
        topPromoCode,
        topPromoCodeCount,
        totalDownloads: downloadsCount,
        totalRevenueFCFA: claimsCount * PRICE,
      });
      setStatsLoading(false);
    };

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        usersDocs = snap.docs.map((d) => d.data());
        usersLoaded = true;
        recompute();
      },
      (err) => console.error("Erreur écoute users (stats admin):", err)
    );
    const unsubDownloads = onSnapshot(
      collection(db, "downloads"),
      (snap) => {
        downloadsCount = snap.size;
        downloadsLoaded = true;
        recompute();
      },
      (err) => console.error("Erreur écoute downloads (stats admin):", err)
    );
    const unsubClaims2 = onSnapshot(
      collection(db, "paymentClaims"),
      (snap) => {
        claimsCount = snap.size;
        claimsLoaded = true;
        recompute();
      },
      (err) => console.error("Erreur écoute paymentClaims (stats admin):", err)
    );

    return () => {
      unsubUsers();
      unsubDownloads();
      unsubClaims2();
    };
  }, [isAdmin]);

  const filteredClaims = claims.filter((c) => {
    const q = claimSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.email?.toLowerCase().includes(q) ||
      (c.reference || c.waveReference || "").toLowerCase().includes(q)
    );
  });

  const addPromo = async () => {
    if (!newCode.trim()) return;
    await setDoc(doc(db, "promoCodes", newCode.trim()), {
      actif: true,
      usageType: newCodeUsageType,
    });
    setNewCode("");
    setNewCodeUsageType("illimite");
  };

  const togglePromo = async (code: string, actif: boolean) => {
    await setDoc(doc(db, "promoCodes", code), { actif: !actif }, { merge: true });
  };

  const toggleUsageType = async (code: string, usageType?: "unique" | "illimite") => {
    const next = usageType === "unique" ? "illimite" : "unique";
    await setDoc(doc(db, "promoCodes", code), { usageType: next }, { merge: true });
  };

  const removePromo = async (code: string) => {
    await deleteDoc(doc(db, "promoCodes", code));
  };

  const toggleTemplate = async (id: string) => {
    const next = !templateStatus[id];
    setTemplateStatus((s) => ({ ...s, [id]: next }));
    await setDoc(doc(db, "templates", id), { actif: next }, { merge: true });
  };

  const toggleReview = async (id: string, displayed: boolean) => {
    await setDoc(doc(db, "reviews", id), { displayed: !displayed }, { merge: true });
  };

  const removeReview = async (id: string) => {
    await deleteDoc(doc(db, "reviews", id));
  };

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-sm">Chargement...</div>;
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-8 space-y-10">
      <AdminCVDownload />

      <section>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-foreground/50 text-[11px] mb-1">
              <Wallet size={13} /> Chiffre d&apos;affaires total
            </div>
            <p className="text-lg font-bold">
              {statsLoading ? "…" : `${(stats?.totalRevenueFCFA ?? 0).toLocaleString("fr-FR")} FCFA`}
            </p>
          </div>
          <div className="rounded-2xl border border-border p-3">
            <div className="flex items-center gap-1.5 text-foreground/50 text-[11px] mb-1">
              <Users size={13} /> Comptes créés
            </div>
            <p className="text-lg font-bold">
              {statsLoading ? "…" : stats?.totalUsers ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-1">Journal des paiements</h2>
        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
          <input
            value={claimSearch}
            onChange={(e) => setClaimSearch(e.target.value)}
            placeholder="Rechercher par email ou référence de paiement"
            className="w-full rounded-2xl border border-border bg-surface pl-8 pr-3 py-2 text-xs"
          />
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {filteredClaims.length === 0 && (
            <p className="text-xs text-foreground/40">
              {claims.length === 0
                ? "Aucun paiement pour le moment."
                : "Aucun résultat pour cette recherche."}
            </p>
          )}
          {filteredClaims.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-2xl border border-border p-2.5 text-xs">
              <div>
                <p>{c.email}</p>
                {(c.reference || c.waveReference) && <p className="text-foreground/40 font-mono text-[10px]">Réf : {c.reference || c.waveReference}</p>}
              </div>
              <span className="text-foreground/40">
                {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleString("fr-FR") : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Codes promo</h2>
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="ex : christedem"
              className="flex-1 rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
            />
            <button
              onClick={addPromo}
              className="flex items-center gap-1 text-sm px-3 py-2 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 transition"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground/50">Ce nouveau code sera :</span>
            <button
              type="button"
              onClick={() => setNewCodeUsageType("illimite")}
              className={`px-2.5 py-1 rounded-full transition ${
                newCodeUsageType === "illimite"
                  ? "bg-brand-600 text-white"
                  : "bg-surface-muted text-foreground/60"
              }`}
            >
              Illimité (jusqu&apos;à désactivation)
            </button>
            <button
              type="button"
              onClick={() => setNewCodeUsageType("unique")}
              className={`px-2.5 py-1 rounded-full transition ${
                newCodeUsageType === "unique"
                  ? "bg-brand-600 text-white"
                  : "bg-surface-muted text-foreground/60"
              }`}
            >
              Usage unique
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {promoCodes.map((p) => (
            <div
              key={p.code}
              className="flex items-center justify-between rounded-2xl border border-border p-3 text-sm"
            >
              <span className="font-mono">{p.code}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleUsageType(p.code, p.usageType)}
                  title="Changer le type d'usage"
                  className="text-[11px] px-2 py-1 rounded-full bg-surface-muted text-foreground/60 hover:bg-surface transition"
                >
                  {p.usageType === "unique" ? "Usage unique" : "Illimité"}
                </button>
                <button
                  onClick={() => togglePromo(p.code, p.actif)}
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    p.actif ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"
                  }`}
                >
                  {p.actif ? "Actif" : "Désactivé"}
                </button>
                <button onClick={() => removePromo(p.code)} className="text-red-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-1">Avis ({reviews.length})</h2>
        <p className="text-xs text-foreground/45 mb-3">
          Choisissez les avis à afficher sur la page d&apos;accueil. Rien n&apos;est visible
          publiquement tant que vous ne l&apos;activez pas ici.
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {reviews.length === 0 && (
            <p className="text-xs text-foreground/40">Aucun avis pour le moment.</p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border p-3 text-xs space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.nom}</p>
                  <div className="flex gap-0.5 my-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={11}
                        className={i < r.note ? "fill-accent-600 text-accent-600" : "text-foreground/15"}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-foreground/35 whitespace-nowrap">
                  {r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString("fr-FR") : ""}
                </span>
              </div>
              <p className="text-foreground/70 leading-relaxed">{r.texte}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => toggleReview(r.id, r.displayed)}
                  className={`px-2.5 py-1 rounded-full ${
                    r.displayed ? "bg-green-500/15 text-green-600" : "bg-surface-muted text-foreground/55"
                  }`}
                >
                  {r.displayed ? "Affiché sur le site" : "Masqué"}
                </button>
                <button onClick={() => removeReview(r.id)} className="text-red-400 hover:text-red-500">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3">Templates ({TEMPLATE_LIST.length})</h2>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_LIST.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-2xl border border-border p-2.5 text-xs"
            >
              <span>{t.nom}</span>
              <button
                onClick={() => toggleTemplate(t.id)}
                className={`px-2 py-1 rounded-full ${
                  templateStatus[t.id]
                    ? "bg-green-500/15 text-green-600"
                    : "bg-red-500/15 text-red-500"
                }`}
              >
                {templateStatus[t.id] ? "Actif" : "Désactivé"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
