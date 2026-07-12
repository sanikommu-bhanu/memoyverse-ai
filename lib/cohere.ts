// ─── 1. Client Initialization ───────────────────────────────────────────────
const KEY = process.env.COHERE_API_KEY || "";
export const hasKey = () => Boolean(KEY && KEY.trim().length > 0);
import { isOllamaAvailable, ollamaEmbed, ollamaGenerate } from "./ollama";

// Startup Diagnostics
if (typeof process !== "undefined" && !process.env.__COHERE_DIAGNOSTICS_RUN) {
  process.env.__COHERE_DIAGNOSTICS_RUN = "1";
  const missing = [
    !KEY && "COHERE_API_KEY",
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
  const checkCohereKey = async () => {
    if (!hasKey()) {
      console.warn("[Cohere Diagnostic] No key provided.");
      return;
    }
    try {
      // 1-token chat request to test the key
      const res = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "command-r-08-2024",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 1
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(`[Cohere Diagnostic] Key rejected! Status: ${res.status}. Error:`, data?.message || data);
      } else {
        console.log(`[Cohere Diagnostic] Key is valid. Access to Cohere APIs confirmed.`);
      }
    } catch (e: any) {
      console.error("[Cohere Diagnostic] Network error checking key:", e.message);
    }
  };
  checkCohereKey();
}

// ─── 2. Rate Limiting & Queueing ────────────────────────────────────────────
// Cohere trial keys: Embed = 5 calls/min (1 every 12s), Chat = 20 calls/min (1 every 3s)
class ThrottleQueue {
  private queue: (() => void)[] = [];
  private isRunning = false;
  private intervalMs: number;
  private lastCallTime = 0;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  async enqueue(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastCallTime;
      if (timeSinceLast < this.intervalMs) {
        await new Promise(r => setTimeout(r, this.intervalMs - timeSinceLast));
      }

      this.lastCallTime = Date.now();
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }

    this.isRunning = false;
  }
}

// 12000ms = 5 per minute max. 3000ms = 20 per minute max.
const embedQueue = new ThrottleQueue(12000);
const chatQueue = new ThrottleQueue(3000);

// ─── 3. Retry Logic & Error Handling ────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function formatError(e: any): never {
  const msg = e?.message || String(e);
  if (msg.includes("invalid api token") || msg.includes("401") || msg.includes("403")) {
    throw new Error("Invalid API key");
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("rate limit")) {
    throw new Error("Rate limit exceeded");
  }
  if (msg.includes("503") || msg.includes("500") || msg.includes("Unavailable") || msg.includes("504")) {
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
      // Don't retry on 401/403 Invalid Key or Timeouts
      if (e?.name === "TimeoutError" || msg.includes("invalid api token") || msg.includes("401") || msg.includes("403")) {
        break;
      }
      // Exponential backoff for 429 and 500s
      const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
      await delay(backoff);
    }
  }
  return formatError(lastError);
}

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

// ─── 4. Operations ──────────────────────────────────────────────────────────

/** Real 1024-dim Cohere embedding via embed-v4.0. Falls back to Ollama → local on failure. */
export async function embed(text: string, isQuery = false): Promise<{values: number[], source: "cohere" | "local", dim: number}> {
  if (!hasKey()) {
    try {
      if (await isOllamaAvailable()) {
        const vals = await ollamaEmbed(text);
        console.log(`[Embed] Served by Ollama (${vals.length}-dim)`);
        return { values: vals, source: "local", dim: vals.length };
      }
    } catch (e: any) {
      console.warn("[Embed] Ollama failed:", e.message);
    }
    const vals = localEmbed(text);
    return { values: vals, source: "local", dim: vals.length };
  }
  
  try {
    return await withRetry(async () => {
      await embedQueue.enqueue(); // Respect 5/min limit
      
      const res = await withTimeout(fetch("https://api.cohere.com/v1/embed", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "embed-english-v3.0",
          texts: [text.slice(0, 8000)],
          input_type: isQuery ? "search_query" : "search_document",
          embedding_types: ["float"]
        })
      }), 12000);
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to embed with Cohere");
      
      const vals = data.embeddings?.float?.[0];
      if (vals && vals.length > 0) {
        console.log(`[Embed] Served by Cohere (${vals.length}-dim)`);
        return { values: vals, source: "cohere", dim: vals.length };
      }
      const localVals = localEmbed(text);
      return { values: localVals, source: "local", dim: localVals.length };
    });
  } catch (e: any) {
    console.warn(`[Embed] Cohere failed: ${e?.message} — trying Ollama…`);
    try {
      if (await isOllamaAvailable()) {
        const vals = await ollamaEmbed(text);
        console.log(`[Embed] Served by Ollama fallback (${vals.length}-dim)`);
        return { values: vals, source: "local", dim: vals.length };
      }
    } catch (oe: any) {
      console.warn("[Embed] Ollama fallback also failed:", oe.message);
    }
    const vals = localEmbed(text);
    return { values: vals, source: "local", dim: vals.length };
  }
}

/** Generate text using Cohere command-r. Falls back to Ollama if key is absent. */
export async function generate(prompt: string, maxTokens = 800): Promise<string> {
  if (!hasKey()) {
    try {
      if (await isOllamaAvailable()) {
        console.log("[Generate] Served by Ollama (no Cohere key)");
        return ollamaGenerate(prompt, maxTokens);
      }
    } catch (e: any) {
      console.warn("[Generate] Ollama failed:", e.message);
    }
    throw new Error("API key not valid. Please pass a valid API key.");
  }
  
  return await withRetry(async () => {
    await chatQueue.enqueue(); // Respect 20/min limit
    
    const res = await withTimeout(fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "command-r-08-2024",
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.1
      })
    }), 20000); // 20 seconds timeout for generation
    
    const data = await res.json();
    if (!res.ok) {
      const e = new Error(data.message || "Failed to generate text with Cohere");
      (e as any).status = res.status;
      throw e;
    }
    
    const text = data.message?.content?.[0]?.text;
    if (!text) throw new Error("Empty response from AI");
    
    console.log("[Generate] Served by Cohere");
    return text.trim();
  });
}

export function parseJSON<T>(t: string, fb: T): T {
  try { return JSON.parse(t.replace(/```json|```/gi, "").trim()) as T; } catch { return fb; }
}

// ─── 5. Local Fallback (unchanged) ──────────────────────────────────────────
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
