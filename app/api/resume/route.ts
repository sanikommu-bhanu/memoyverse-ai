import { NextRequest, NextResponse } from "next/server";
import { buildResume } from "@/lib/rag";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const { template } = await req.json().catch(() => ({ template: "ATS" }));
  const resume = await buildResume(template || "ATS", uid);
  return NextResponse.json({ resume });
}
