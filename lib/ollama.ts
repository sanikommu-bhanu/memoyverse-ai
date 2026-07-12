/**
 * lib/ollama.ts — free, local Ollama fallback for embed() and generate()
 *
 * Setup (one-time, no API cost):
 *   1. Install Ollama: https://ollama.ai
 *   2. ollama pull nomic-embed-text   (for embeddings — 768-dim, matches Gemini)
 *   3. ollama pull llama3.2           (for text generation)
 *   4. Run: ollama serve              (starts at http://localhost:11434)
 */

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
const GEN_MODEL   = process.env.OLLAMA_GEN_MODEL   || "llama3.2";

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text.slice(0, 8000) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama embed failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  if (!data.embedding?.length) throw new Error("Ollama returned empty embedding");
  return data.embedding as number[];
}

export async function ollamaGenerate(prompt: string, maxTokens = 800): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEN_MODEL,
      prompt,
      options: { num_predict: maxTokens },
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama generate failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  if (!data.response) throw new Error("Ollama returned empty response");
  return data.response.trim();
}
