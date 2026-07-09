export type DocCat = "Certificate"|"Project"|"Internship"|"Skill"|"Research"|"Achievement"|"Resume"|"Other";

export interface Entities {
  skills: string[];
  orgs: string[];
  dates: string[];
  tech: string[];
}

export interface MemDoc {
  id: string;
  title: string;
  cat: DocCat;
  fileName: string;
  mime: string;
  rawText: string;
  summary: string;
  entities: Entities;
  year: string;
  confidence: number;
  embedding: number[];
  uploadedAt: string;
  source?: string; // "github" | "drive" | "linkedin" | "onedrive" | "upload"
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string; score: number }[];
  at: string;
}

export interface Profile {
  name: string;
  email: string;
  title: string;
  location: string;
  bio: string;
  avatar?: string;
}

export interface OAuthTokens {
  github?: string;
  google?: string;
  linkedin?: string;
  microsoft?: string;
}

export interface Store {
  docs: MemDoc[];
  chat: ChatMsg[];
  profile: Profile | null;
  tokens: OAuthTokens;
}
