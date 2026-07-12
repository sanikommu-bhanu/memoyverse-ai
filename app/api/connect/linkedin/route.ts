import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { linkedinFetch } from "@/lib/oauth";
import { analyzeDoc } from "@/lib/analyze";
import { addDoc, setProfile, getProfile } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  if (uid === "local") console.warn("No valid Firebase auth token — writing to shared local store.");
  const token = db.getTokens().linkedin;
  if (!token) return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 });
  try {
    const profile = await linkedinFetch("/userinfo", token);
    const email = profile.email || "";
    const firstName = profile.given_name || "";
    const lastName = profile.family_name || "";
    const name = `${firstName} ${lastName}`.trim();
    const headline = "LinkedIn User"; // userinfo does not provide headline/summary
    const picture = profile.picture || "";
    
    // Auto-update profile
    const existing = await getProfile(uid);
    if (!existing?.name && name) {
      await setProfile({ name, email, title: headline, location: "", bio: "", avatar: picture }, uid);
    }

    const rawText = `LinkedIn Profile: ${name}\nEmail: ${email}`;
    const analysis = await analyzeDoc(rawText, "linkedin_profile");
    await addDoc({
      id: `li_${profile.sub || "unknown"}`, title: `${name} — LinkedIn Profile`,
      cat: "Resume", fileName: "LinkedIn Profile", mime: "text/plain",
      rawText, summary: `LinkedIn profile for ${name}: ${headline}`,
      entities: analysis.entities, year: String(new Date().getFullYear()),
      confidence: 95, embedding: analysis.embedding,
      embeddingSource: analysis.embeddingSource, embeddingDim: analysis.embeddingDim,
      uploadedAt: new Date().toISOString(), source: "linkedin",
    }, uid);
    return NextResponse.json({ ok: true, name, headline, email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
