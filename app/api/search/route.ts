import { NextRequest, NextResponse } from "next/server";
import { semanticSearchWithMeta } from "@/lib/vector";
import { getDocs } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  if (uid === "local") console.warn("[Search] No valid auth token — searching local bucket.");
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const cat = sp.get("cat") || "All";
  if (!q.trim()) {
    const docs = await getDocs(uid);
    const list = cat === "All" ? docs : docs.filter(d => d.cat === cat);
    return NextResponse.json({ results: list.map(d => ({ doc: d, score: 1 })), needsReembed: 0 });
  }
  try {
    const { results, skippedMismatch } = await semanticSearchWithMeta(q, 20, cat === "All" ? undefined : cat, uid);
    return NextResponse.json({ results, needsReembed: skippedMismatch });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
