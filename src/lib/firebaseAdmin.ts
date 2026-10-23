// Firebase Admin (serveur uniquement) : écritures Firestore réservées au
// serveur (paiements, déblocage). La vérification des identités passe par
// verifyUser.ts : firebase-admin/auth n'est volontairement pas importé ici.
//
// Variable d'environnement requise : FIREBASE_SERVICE_ACCOUNT_JSON
// (le contenu du fichier JSON de compte de service, brut ou encodé en base64).
import { cert, getApps, initializeApp } from "firebase-admin/app";
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

export const adminDb = () => getFirestore(adminApp());
