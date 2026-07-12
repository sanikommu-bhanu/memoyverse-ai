// ─── 1. Client Initialization ───────────────────────────────────────────────
const KEY = process.env.GEMINI_API_KEY || "";
export const hasKey = () => Boolean(KEY && KEY.trim().length > 0);

const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.0-flash";
const GEMINI_EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

// Startup Diagnostics
if (typeof process !== "undefined" && !process.env.__GEMINI_DIAGNOSTICS_RUN) {
  process.env.__GEMINI_DIAGNOSTICS_RUN = "1";
  const missing = [
    !KEY && "GEMINI_API_KEY",
    !process.env.FIREBASE_ADMIN_PROJECT_ID && "FIREBASE_ADMIN_*",
    !process.env.GITHUB_CLIENT_ID && "GITHUB_*",
    !process.env.GOOGLE_CLIENT_ID && "GOOGLE_*",
    !process.env.LINKEDIN_CLIENT_ID && "LINKEDIN_*",
    !process.env.MICROSOFT_CLIENT_ID && "MICROSOFT_*"
  ].filter(Boolean);
  if (missing.length > 0) {
    console.warn("[Startup Warning] Missing environment variables. Some features will fall back to local mode or fail:", missing.join(", "));
  }

  // Diagnostic check
  const checkGeminiKey = async () => {
    if (!hasKey()) {
      console.warn("[Gemini Diagnostic] No key provided.");
      return;
    }
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: { "x-goog-api-key": KEY }
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`[Gemini Diagnostic] Key rejected! Status: ${res.status}. Error:`, data?.error?.message || data);
      } else {
        console.log(`[Gemini Diagnostic] Key is valid. Access to ${data.models?.length || 0} models confirmed.`);
      }
    } catch (e: any) {
      console.error("[Gemini Diagnostic] Network error checking key:", e.message);
    }
  };
  checkGeminiKey();
}

// ─── 2. Retry Logic & Error Handling ────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function formatError(e: any): never {
  const msg = e?.message || String(e);
  if (msg.includes("API key not valid") || msg.includes("400") || msg.includes("404") || msg.includes("NOT_FOUND")) {
    throw new Error("Invalid API key");
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) {
    throw new Error("Rate limit exceeded");
  }
  if (msg.includes("503") || msg.includes("500") || msg.includes("Unavailable")) {
    throw new Error("Service unavailable. The AI service is currently down.");
  }
  if (e?.name === "TimeoutError" || msg.includes("timeout")) {
    throw new Error("Request timed out.");
  }
  throw new Error(`Network error or AI failure: ${msg}`);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const msg = e?.message || "";
      // Don't retry on 400/404 Invalid Key or Timeouts
      if (e?.name === "TimeoutError" || msg.includes("API key not valid") || msg.includes("400") || msg.includes("404") || msg.includes("NOT_FOUND")) {
        break;
      }
      // Exponential backoff for 429 and 500s
      const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
      await delay(backoff);
    }
  }
  return formatError(lastError);
}

// ─── 3. Operations ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const e = new Error("Request timed out.");
      e.name = "TimeoutError";
      reject(e);
    }, ms);
    promise.then(resolve).catch(reject).finally(() => clearTimeout(timer));
  });
}

/** Real 768-dim Gemini embedding via gemini-embedding-2 */
export async function embed(text: string): Promise<{values: number[], source: "gemini" | "local", dim: number}> {
  if (!hasKey()) {
    const vals = localEmbed(text);
    return { values: vals, source: "local", dim: vals.length };
  }
  try {
    return await withRetry(async () => {
      const res = await withTimeout(fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text: text.slice(0, 8000) }] }
        })
      }), 8000);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const vals = data.embedding?.values;
      if (vals && vals.length > 0) return { values: vals, source: "gemini", dim: vals.length };
      const localVals = localEmbed(text);
      return { values: localVals, source: "local", dim: localVals.length };
    });
  } catch (e: any) {
    console.warn(`[AI Fallback] Embedding failed: ${e?.message}`);
    const vals = localEmbed(text);
    return { values: vals, source: "local", dim: vals.length };
  }
}

/** Generate text using gemini-2.0-flash */
export async function generate(prompt: string, maxTokens = 800): Promise<string> {
  if (!hasKey()) throw new Error("API key not valid. Please pass a valid API key.");
  return await withRetry(async () => {
    const res = await withTimeout(fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 }
      })
    }), 12000);
    const data = await res.json();
    if (data.error) {
      const e = new Error(data.error.message);
      (e as any).status = data.error.code;
      throw e;
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from AI");
    return text.trim();
  });
}

export function parseJSON<T>(t: string, fb: T): T {
  try { return JSON.parse(t.replace(/```json|```/gi, "").trim()) as T; } catch { return fb; }
}

// ─── 4. Local Fallback (unchanged) ──────────────────────────────────────────
const VOCAB = [
  "python","javascript","typescript","react","node","java","c++","tensorflow","pytorch",
  "machine learning","deep learning","computer vision","nlp","sql","mongodb","firebase",
  "aws","docker","kubernetes","git","github","figma","data structures","algorithms",
  "opencv","flask","django","express","nextjs","html","css","tailwind","api","graphql",
  "linux","cloud","certificate","project","internship","research","achievement","resume",
  "skill","university","college","hackathon","award","publication","2021","2022","2023",
  "2024","2025","2026","engineer","developer","intern","analyst","scientist","student",
  "bachelor","master","degree","coursera","udemy","google","microsoft","amazon","meta",
  "mobile","web","backend","frontend","fullstack","devops","ai","ml","data","analysis",
  "pandas","numpy","kaggle","excel","portfolio","linkedin","certification","completion",
  "issued","workshop","conference","paper","thesis","leadership","team","experience",
];
function localEmbed(text: string): number[] {
  const l = text.toLowerCase();
  return VOCAB.map(w => Math.min(1, (l.split(w).length - 1) * 0.4));
}
