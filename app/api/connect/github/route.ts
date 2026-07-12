import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { githubFetch } from "@/lib/oauth";
import { analyzeDoc } from "@/lib/analyze";
import { MemDoc } from "@/lib/types";
import { addDoc } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  if (uid === "local") console.warn("No valid Firebase auth token — writing to shared local store.");
  const token = db.getTokens().github;
  if (!token) return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
  try {
    const repos = await githubFetch("/user/repos?per_page=30&sort=updated", token);
    const imported: MemDoc[] = [];
    for (const r of repos.slice(0, 10)) {
      const rawText = `GitHub Repository: ${r.full_name}
Description: ${r.description || "No description"}
Language: ${r.language || "Unknown"}
Stars: ${r.stargazers_count} | Forks: ${r.forks_count}
Topics: ${(r.topics || []).join(", ")}
URL: ${r.html_url}
Created: ${r.created_at?.slice(0, 4)}
Last updated: ${r.updated_at?.slice(0, 4)}`;
      const analysis = await analyzeDoc(rawText, `${r.name}.github`);
      const doc: MemDoc = {
        id: `gh_${r.id}`, title: r.full_name || r.name,
        cat: "Projects", fileName: `${r.name} (GitHub)`,
        mime: "text/plain", rawText,
        summary: r.description || `GitHub project: ${r.name}`,
        entities: { ...analysis.entities, tech: r.language ? [r.language, ...analysis.entities.tech] : analysis.entities.tech },
        year: r.created_at?.slice(0, 4) || String(new Date().getFullYear()),
        confidence: 90, embedding: analysis.embedding,
        embeddingSource: analysis.embeddingSource, embeddingDim: analysis.embeddingDim,
        uploadedAt: new Date().toISOString(), source: "github",
      };
      await addDoc(doc, uid);
      imported.push(doc);
    }
    return NextResponse.json({ ok: true, count: imported.length, docs: imported });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
