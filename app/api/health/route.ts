import { NextResponse } from "next/server";

const KEY = process.env.COHERE_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET() {
  // ── Cohere health check ──────────────────────────────────────────────────────
  let cohere: "ok" | "key_invalid" | "rate_limited" | "not_configured" | "network_error" = "not_configured";
  let detail = "COHERE_API_KEY is not set";

  if (KEY.trim()) {
    try {
      const res = await fetch("https://api.cohere.com/v1/models", {
        headers: { 
          "Authorization": `Bearer ${KEY}`,
          "Accept": "application/json"
        },
        signal: AbortSignal.timeout(6000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        cohere = "ok";
        detail = `Key valid — ${data.models?.length ?? "?"} models accessible`;
      } else if (res.status === 429) {
        cohere = "rate_limited";
        detail = data?.message ?? "Quota exceeded (trial key limit)";
      } else {
        cohere = "key_invalid";
        detail = data?.message ?? `HTTP ${res.status}`;
      }
    } catch (e: any) {
      cohere = "network_error" as any;
      detail = e?.message ?? "fetch failed";
    }
  }

  // ── Firebase Admin check ──────────────────────────────────────────────────────
  const firebaseAdmin = Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  // ── Ollama check (optional local fallback) ────────────────────────────────────
  let ollama: "ok" | "not_running" = "not_running";
  try {
    const r = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(1000) });
    if (r.ok) ollama = "ok";
  } catch { /* not running */ }

  // ── Missing optional env vars ─────────────────────────────────────────────────
  const missingOptional = [
    !process.env.GITHUB_CLIENT_ID && "GITHUB_*",
    !process.env.GOOGLE_CLIENT_ID && "GOOGLE_*",
    !process.env.LINKEDIN_CLIENT_ID && "LINKEDIN_*",
    !process.env.MICROSOFT_CLIENT_ID && "MICROSOFT_*",
  ].filter(Boolean);

  return NextResponse.json({
    cohere,
    detail,
    firebaseAdmin,
    ollama,
    missingOptional,
    tips: cohere !== "ok" ? [
      "Check dashboard.cohere.com → API Keys (Trial keys are free)",
      "Trial limits: 5 embed calls/min, 20 chat calls/min",
      "If ollama=ok, embed() and generate() will fall back to Ollama automatically",
    ] : [],
  });
}
