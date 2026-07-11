import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { linkedinFetch } from "@/lib/oauth";
import { analyzeDoc } from "@/lib/analyze";
import { addDoc, setProfile, getProfile } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const token = db.getTokens().linkedin;
  if (!token) return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 });
  try {
    const profile = await linkedinFetch("/me?projection=(id,firstName,lastName,headline,summary,positions,educations,skills)", token);
    const emailData = await linkedinFetch("/emailAddress?q=members&projection=(elements*(handle~))", token).catch(() => null);
    const email = emailData?.elements?.[0]?.["handle~"]?.emailAddress || "";
    const firstName = profile.firstName?.localized?.en_US || "";
    const lastName = profile.lastName?.localized?.en_US || "";
    const name = `${firstName} ${lastName}`.trim();
    const headline = profile.headline?.localized?.en_US || "";
    
    // Auto-update profile
    const existing = await getProfile(uid);
    if (!existing?.name && name) {
      await setProfile({ name, email, title: headline, location: "", bio: "" }, uid);
    }

    const rawText = `LinkedIn Profile: ${name}
Headline: ${headline}
Email: ${email}
Summary: ${profile.summary?.localized?.en_US || ""}`;
    const analysis = await analyzeDoc(rawText, "linkedin_profile");
    await addDoc({
      id: `li_${profile.id}`, title: `${name} — LinkedIn Profile`,
      cat: "Resume", fileName: "LinkedIn Profile", mime: "text/plain",
      rawText, summary: `LinkedIn profile for ${name}: ${headline}`,
      entities: analysis.entities, year: String(new Date().getFullYear()),
      confidence: 95, embedding: analysis.embedding,
      uploadedAt: new Date().toISOString(), source: "linkedin",
    }, uid);
    return NextResponse.json({ ok: true, name, headline, email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
