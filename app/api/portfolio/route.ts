import { NextRequest, NextResponse } from "next/server";
import { buildPortfolioHTML } from "@/lib/rag";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const authHeader = req.headers.get("Authorization") || (token ? `Bearer ${token}` : null);
  const uid = await verifyToken(authHeader) ?? "local";
  const html = await buildPortfolioHTML(uid);
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
