import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Only initialize if config is present
export const isFirebaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

let app: ReturnType<typeof initializeApp> | null = null;

function getApp() {
  if (!isFirebaseConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  const a = getApp();
  return a ? getAuth(a) : null;
}

export function getFirebaseDB() {
  const a = getApp();
  return a ? getFirestore(a) : null;
}

export function getFirebaseStorage() {
  const a = getApp();
  return a ? getStorage(a) : null;
}

export async function getFirebaseMessaging() {
  const a = getApp();
  if (!a) return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(a);
}

export const googleProvider = () => {
  const p = new GoogleAuthProvider();
  p.addScope("email");
  p.addScope("profile");
  return p;
};

export const appleProvider = () => {
  const p = new OAuthProvider("apple.com");
  p.addScope("email");
  p.addScope("name");
  return p;
};

// ── Auth-ready promise ────────────────────────────────────────────────────────
// Firebase restores session state asynchronously. Calling auth.currentUser
// synchronously on page load returns null even when a session exists.
// We resolve this promise once onAuthStateChanged fires for the first time,
// then every subsequent getAuthHeader() call is instant (promise is cached).
let authReady: Promise<import("firebase/auth").User | null> | null = null;

function waitForAuth() {
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const auth = getFirebaseAuth();
      if (!auth) return resolve(null);
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub(); // unsubscribe after first event — we only need the initial state
        resolve(user);
      });
    });
  }
  return authReady;
}

export const getAuthHeader = async (): Promise<Record<string, string>> => {
  if (!isFirebaseConfigured()) return {};
  const user = await waitForAuth();
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
};
