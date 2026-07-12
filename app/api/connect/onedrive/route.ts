import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { msFetch } from "@/lib/oauth";
import { analyzeDoc } from "@/lib/analyze";
import { MemDoc } from "@/lib/types";
import { addDoc } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  if (uid === "local") console.warn("No valid Firebase auth token — writing to shared local store.");
  const token = db.getTokens().microsoft;
  if (!token) return NextResponse.json({ error: "OneDrive not connected" }, { status: 401 });
  try {
    const data = await msFetch("/me/drive/root/children?$top=20&$select=id,name,file,createdDateTime,lastModifiedDateTime,description", token);
    const items = (data.value || []).filter((i: any) => i.file);
    const imported: MemDoc[] = [];
    for (const f of items.slice(0, 10)) {
      const rawText = `OneDrive File: ${f.name}\nType: ${f.file?.mimeType || "unknown"}\nCreated: ${f.createdDateTime?.slice(0,10)}\nModified: ${f.lastModifiedDateTime?.slice(0,10)}`;
      const analysis = await analyzeDoc(rawText, f.name);
      const doc: MemDoc = {
        id: `od_${f.id}`, title: f.name, cat: analysis.cat,
        fileName: `${f.name} (OneDrive)`, mime: f.file?.mimeType || "application/octet-stream",
        rawText, summary: analysis.summary, entities: analysis.entities,
        year: f.createdDateTime?.slice(0,4) || String(new Date().getFullYear()),
        confidence: 78, embedding: analysis.embedding,
        embeddingSource: analysis.embeddingSource, embeddingDim: analysis.embeddingDim,
        uploadedAt: new Date().toISOString(), source: "onedrive",
      };
      await addDoc(doc, uid); imported.push(doc);
    }
    return NextResponse.json({ ok: true, count: imported.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
