// Firebase Admin (serveur uniquement) : sert à vérifier l'identité de la
// personne qui paie et à écrire le résultat d'un paiement vérifié, ce que les
// règles Firestore interdisent volontairement au navigateur.
//
// Variable d'environnement requise : FIREBASE_SERVICE_ACCOUNT_JSON
// (le contenu du fichier JSON de compte de service, brut ou encodé en base64).
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function adminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON manquante");
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const sa = JSON.parse(text);

  return initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: String(sa.private_key).replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
