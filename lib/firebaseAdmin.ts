// Server-side Firebase Admin SDK
// Used in API routes for: Firestore writes, Storage uploads, token verification, FCM

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";
import { getAuth, Auth } from "firebase-admin/auth";
import { getMessaging, Messaging } from "firebase-admin/messaging";

export const isAdminConfigured = () =>
  Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

let adminApp: App | null = null;

function getAdminApp(): App | null {
  if (!isAdminConfigured()) return null;
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    return adminApp;
  } catch (e) {
    console.error("[FirebaseAdmin] Init failed:", e);
    return null;
  }
}

export function adminDB(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function adminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}

export function adminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function adminMessaging(): Messaging | null {
  const app = getAdminApp();
  return app ? getMessaging(app) : null;
}

/** Verify Firebase ID token from Authorization header */
export async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const auth = adminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** Send FCM push notification */
export async function sendNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const msg = adminMessaging();
  if (!msg) return false;
  try {
    await msg.send({ token, notification: { title, body }, data });
    return true;
  } catch {
    return false;
  }
}
