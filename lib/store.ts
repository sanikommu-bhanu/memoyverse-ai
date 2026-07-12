import fs from "fs";
import path from "path";
import os from "os";
import { cookies } from "next/headers";
import { Store, MemDoc, ChatMsg, Profile, OAuthTokens } from "./types";

const DIR = path.join(os.tmpdir(), "memoryverse_data");
const FILE = path.join(DIR, "store.json");
const empty = (): Store => ({ docs: [], chat: [], profile: null, tokens: {} });

function ensure() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify(empty(), null, 2));
}

function read(): Store {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, "utf-8")); }
  catch { return empty(); }
}

function write(s: Store) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
}

export const db = {
  getDocs: (): MemDoc[] => read().docs,
  getDoc: (id: string) => read().docs.find(d => d.id === id),
  addDoc(doc: MemDoc) { const s = read(); s.docs.unshift(doc); write(s); },
  delDoc(id: string) { const s = read(); s.docs = s.docs.filter(d => d.id !== id); write(s); },
  getChat: (): ChatMsg[] => read().chat,
  addChat(m: ChatMsg) { const s = read(); s.chat.push(m); write(s); },
  clearChat() { const s = read(); s.chat = []; write(s); },
  getProfile: (): Profile | null => read().profile,
  setProfile(p: Profile) { const s = read(); s.profile = p; write(s); },
  getTokens: (): OAuthTokens => {
    try {
      const c = cookies();
      return {
        github: c.get("github_token")?.value,
        google: c.get("google_token")?.value,
        linkedin: c.get("linkedin_token")?.value,
        microsoft: c.get("microsoft_token")?.value,
      };
    } catch {
      return read().tokens || {};
    }
  },
  setToken(provider: keyof OAuthTokens, token: string) {
    try {
      const isProd = process.env.NODE_ENV === "production";
      cookies().set(`${provider}_token`, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    } catch {}
    const s = read();
    s.tokens = s.tokens || {};
    s.tokens[provider] = token;
    write(s);
  },
  wipe() { write(empty()); },
};
