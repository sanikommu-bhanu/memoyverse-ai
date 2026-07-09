/**
 * HybridStore — uses Firestore when Firebase is configured, falls back to
 * the local file-based store. API routes import from here, not from store.ts.
 */
import { MemDoc, ChatMsg, Profile, OAuthTokens } from "./types";
import { db as localDB } from "./store";
import { adminDB, isAdminConfigured } from "./firebaseAdmin";

function fs() {
  return adminDB();
}

// ─── User context ────────────────────────────────────────────────────────────
// When Firebase is active we scope data per userId.
// When local, userId is ignored (single-user local file).
export const ANON = "local";

// ─── Documents ───────────────────────────────────────────────────────────────
export async function getDocs(userId = ANON): Promise<MemDoc[]> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      const snap = await db.collection("users").doc(userId).collection("docs")
        .orderBy("uploadedAt", "desc").limit(200).get();
      return snap.docs.map(d => d.data() as MemDoc);
    } catch { /* fall through */ }
  }
  return localDB.getDocs();
}

export async function getDoc(id: string, userId = ANON): Promise<MemDoc | undefined> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      const snap = await db.collection("users").doc(userId).collection("docs").doc(id).get();
      return snap.exists ? (snap.data() as MemDoc) : undefined;
    } catch { /* fall through */ }
  }
  return localDB.getDoc(id);
}

export async function addDoc(doc: MemDoc, userId = ANON): Promise<void> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      await db.collection("users").doc(userId).collection("docs").doc(doc.id).set(doc);
      return;
    } catch { /* fall through */ }
  }
  localDB.addDoc(doc);
}

export async function delDoc(id: string, userId = ANON): Promise<void> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      await db.collection("users").doc(userId).collection("docs").doc(id).delete();
      return;
    } catch { /* fall through */ }
  }
  localDB.delDoc(id);
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export async function getChat(userId = ANON): Promise<ChatMsg[]> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      const snap = await db.collection("users").doc(userId).collection("chat")
        .orderBy("at", "asc").limit(200).get();
      return snap.docs.map(d => d.data() as ChatMsg);
    } catch { /* fall through */ }
  }
  return localDB.getChat();
}

export async function addChat(msg: ChatMsg, userId = ANON): Promise<void> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      await db.collection("users").doc(userId).collection("chat").doc(msg.id).set(msg);
      return;
    } catch { /* fall through */ }
  }
  localDB.addChat(msg);
}

export async function clearChat(userId = ANON): Promise<void> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      const snap = await db.collection("users").doc(userId).collection("chat").get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      return;
    } catch { /* fall through */ }
  }
  localDB.clearChat();
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export async function getProfile(userId = ANON): Promise<Profile | null> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      const snap = await db.collection("users").doc(userId).get();
      const data = snap.data();
      return data?.profile ?? null;
    } catch { /* fall through */ }
  }
  return localDB.getProfile();
}

export async function setProfile(profile: Profile, userId = ANON): Promise<void> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      await db.collection("users").doc(userId).set({ profile }, { merge: true });
      return;
    } catch { /* fall through */ }
  }
  localDB.setProfile(profile);
}

// ─── OAuth tokens (always local — never store OAuth tokens in Firestore) ─────
export function getTokens(): OAuthTokens { return localDB.getTokens(); }
export function setToken(p: keyof OAuthTokens, t: string) { localDB.setToken(p, t); }

// ─── Wipe ────────────────────────────────────────────────────────────────────
export async function wipeAll(userId = ANON): Promise<void> {
  const db = fs();
  if (db && isAdminConfigured()) {
    try {
      const [docsSnap, chatSnap] = await Promise.all([
        db.collection("users").doc(userId).collection("docs").get(),
        db.collection("users").doc(userId).collection("chat").get(),
      ]);
      const batch = db.batch();
      docsSnap.docs.forEach(d => batch.delete(d.ref));
      chatSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(db.collection("users").doc(userId));
      await batch.commit();
    } catch { /* fall through */ }
  }
  localDB.wipe();
}
