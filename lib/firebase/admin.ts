import { initializeApp, getApps, getApp, applicationDefault, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Falls back to Application Default Credentials (gcloud auth application-default login)
  // when no service account key is configured — this project's org policy blocks key creation.
  if (!clientEmail || !privateKey) {
    if (!projectId) {
      throw new Error("Variable FIREBASE_ADMIN_PROJECT_ID manquante.");
    }
    return initializeApp({ credential: applicationDefault(), projectId });
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
