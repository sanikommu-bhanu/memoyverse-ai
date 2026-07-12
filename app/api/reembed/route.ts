import { NextRequest, NextResponse } from "next/server";
import { getDocs, addDoc } from "@/lib/hybridStore";
import { embed, hasKey } from "@/lib/cohere";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
    if (!hasKey()) {
      return NextResponse.json({ error: "No Cohere API key configured. Cannot re-embed." }, { status: 400 });
    }

    const docs = await getDocs(uid);
    const localDocs = docs.filter(d => d.embeddingSource !== "cohere");

    if (localDocs.length === 0) {
      return NextResponse.json({ ok: true, message: "All documents are already embedded with Cohere." });
    }

    let successCount = 0;
    for (const doc of localDocs) {
      try {
        const result = await embed(doc.rawText, false); // isQuery = false for docs
        if (result.source === "cohere") {
          const updatedDoc = {
            ...doc,
            embedding: result.values,
            embeddingSource: result.source,
            embeddingDim: result.dim,
          };
          await addDoc(updatedDoc, uid);
          successCount++;
        }
      } catch (e: any) {
        console.warn(`[Re-embed] Failed to re-embed doc ${doc.id}:`, e.message);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Re-embedded ${successCount} out of ${localDocs.length} local documents.`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Re-embedding failed" }, { status: 500 });
  }
}
