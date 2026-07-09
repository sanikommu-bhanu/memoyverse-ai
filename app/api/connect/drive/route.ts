import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { driveFetch } from "@/lib/oauth";
import { analyzeDoc } from "@/lib/analyze";
import { MemDoc } from "@/lib/types";

export async function POST() {
  const token = db.getTokens().google;
  if (!token) return NextResponse.json({ error: "Google Drive not connected" }, { status: 401 });
  try {
    const data = await driveFetch(
      "/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,description,createdTime,modifiedTime)&q=trashed=false",
      token
    );
    const files = data.files || [];
    const imported: MemDoc[] = [];
    for (const f of files.slice(0, 10)) {
      const rawText = `Google Drive File: ${f.name}
Type: ${f.mimeType}
Description: ${f.description || ""}
Created: ${f.createdTime?.slice(0, 10)}
Modified: ${f.modifiedTime?.slice(0, 10)}`;
      const analysis = await analyzeDoc(rawText, f.name);
      const doc: MemDoc = {
        id: `drive_${f.id}`, title: f.name, cat: analysis.cat,
        fileName: `${f.name} (Drive)`, mime: f.mimeType, rawText,
        summary: analysis.summary, entities: analysis.entities,
        year: f.createdTime?.slice(0, 4) || String(new Date().getFullYear()),
        confidence: 80, embedding: analysis.embedding,
        uploadedAt: new Date().toISOString(), source: "drive",
      };
      db.addDoc(doc);
      imported.push(doc);
    }
    return NextResponse.json({ ok: true, count: imported.length, docs: imported });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
