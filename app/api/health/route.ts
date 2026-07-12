import { NextResponse } from "next/server";

const KEY = process.env.GEMINI_API_KEY || "";

export const dynamic = "force-dynamic";

export async function GET() {
  // ── Gemini health check ──────────────────────────────────────────────────────
  let gemini: "ok" | "key_invalid" | "rate_limited" | "not_configured" | "network_error" = "not_configured";
  let detail = "GEMINI_API_KEY is not set";

  if (KEY.trim()) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": KEY },
        signal: AbortSignal.timeout(6000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        gemini = "ok";
        detail = `Key valid — ${data.models?.length ?? "?"} models accessible`;
      } else if (res.status === 429) {
        gemini = "rate_limited";
        detail = data?.error?.message ?? "Quota exceeded (free tier per-minute limit)";
      } else {
        gemini = "key_invalid";
        detail = data?.error?.message ?? `HTTP ${res.status}`;
      }
    } catch (e: any) {
      gemini = "network_error" as any;
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
    gemini,
    detail,
    firebaseAdmin,
    ollama,
    missingOptional,
    tips: gemini !== "ok" ? [
      "Check https://console.cloud.google.com → APIs & Services → Enabled APIs → 'Generative Language API'",
      "Ensure the API key belongs to the correct Google Cloud project",
      "Free tier: 60 requests/min per project. Burst uploads may trigger rate limits",
      "If ollama=ok, embed() and generate() will fall back to Ollama automatically",
    ] : [],
  });
}
