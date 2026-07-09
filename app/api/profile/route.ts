import { NextRequest, NextResponse } from "next/server";
import { getProfile, setProfile, getTokens } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  return NextResponse.json({ profile: await getProfile(uid), tokens: getTokens() });
}
export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const p = await req.json();
  await setProfile(p, uid);
  return NextResponse.json({ ok: true, profile: p });
}
