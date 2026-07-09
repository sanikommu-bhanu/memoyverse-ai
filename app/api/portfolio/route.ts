import { NextRequest, NextResponse } from "next/server";
import { buildPortfolioHTML } from "@/lib/rag";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const html = await buildPortfolioHTML(uid);
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
