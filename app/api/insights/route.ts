import { NextRequest, NextResponse } from "next/server";
import { getInsights } from "@/lib/rag";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  return NextResponse.json(await getInsights(uid));
}
