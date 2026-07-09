import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { msFetch } from "@/lib/oauth";
import { analyzeDoc } from "@/lib/analyze";
import { MemDoc } from "@/lib/types";

export async function POST() {
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
        uploadedAt: new Date().toISOString(), source: "onedrive",
      };
      db.addDoc(doc); imported.push(doc);
    }
    return NextResponse.json({ ok: true, count: imported.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
