import { NextRequest, NextResponse } from "next/server";
import { semanticSearch } from "@/lib/vector";
import { getDocs } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q") || "";
  const cat = sp.get("cat") || "All";
  if (!q.trim()) {
    const docs = await getDocs(uid);
    const list = cat === "All" ? docs : docs.filter(d => d.cat === cat);
    return NextResponse.json({ results: list.map(d => ({ doc: d, score: 1 })) });
  }
  try {
    const results = await semanticSearch(q, 20, cat === "All" ? undefined : cat, uid);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
