const KEY = process.env.GEMINI_API_KEY || "";
const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const hasKey = () => KEY.length > 10;

async function gPost(url: string, body: object) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  return r.json();
}

/** Real 768-dim Gemini embedding via text-embedding-004 */
export async function embed(text: string): Promise<number[]> {
  if (!hasKey()) return localEmbed(text);
  try {
    const d = await gPost(
      `${BASE}/models/text-embedding-004:embedContent?key=${KEY}`,
      { model: "models/text-embedding-004", content: { parts: [{ text: text.slice(0, 8000) }] } }
    );
    return d.embedding.values as number[];
  } catch {
    return localEmbed(text);
  }
}

/** Real Gemini 1.5 Flash generation */
export async function generate(prompt: string, max = 1200): Promise<string> {
  if (!hasKey()) throw new Error("NO_KEY");
  const d = await gPost(
    `${BASE}/models/gemini-1.5-flash:generateContent?key=${KEY}`,
    { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: max } }
  );
  return d.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
}

export function parseJSON<T>(t: string, fb: T): T {
  try { return JSON.parse(t.replace(/```json|```/gi, "").trim()) as T; } catch { return fb; }
}

// 128-dim local fallback embedding
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
