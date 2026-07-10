import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { extractText } from "@/lib/extract";
import { analyzeDoc } from "@/lib/analyze";
import { addDoc } from "@/lib/hybridStore";
import { adminStorage, isAdminConfigured, verifyToken } from "@/lib/firebaseAdmin";
import { MemDoc } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
    const fd = await req.formData();
    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const os = await import("os");
    const path = await import("path");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const tmp = path.join(os.tmpdir(), `mv_${Date.now()}_${safeName}`);
    fs.writeFileSync(tmp, buf);

    let fileUrl = "";
    // Upload to Firebase Storage if configured
    if (isAdminConfigured()) {
      try {
        const storage = adminStorage();
        if (storage) {
          const bucket = storage.bucket();
          const dest = `users/${uid}/documents/${Date.now()}_${safeName}`;
          await bucket.upload(tmp, { destination: dest, metadata: { contentType: file.type } });
          const [url] = await bucket.file(dest).getSignedUrl({
            action: "read", expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
          });
          fileUrl = url;
        }
      } catch (e) { console.warn("[Upload] Firebase Storage failed, continuing:", e); }
    }

    try {
      const rawText = await extractText(tmp, file.type, file.name);
      const analysis = await analyzeDoc(rawText, file.name);
      const doc: MemDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        title: analysis.title, cat: analysis.cat,
        fileName: file.name, mime: file.type,
        rawText: rawText.slice(0, 12000),
        summary: analysis.summary, entities: analysis.entities,
        year: analysis.year, confidence: analysis.confidence,
        embedding: analysis.embedding,
        uploadedAt: new Date().toISOString(),
        source: "upload",
        ...(fileUrl ? { fileUrl } : {}),
      };
      await addDoc(doc, uid);
      return NextResponse.json({ ok: true, doc });
    } finally {
      try { fs.unlinkSync(tmp); } catch { }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
