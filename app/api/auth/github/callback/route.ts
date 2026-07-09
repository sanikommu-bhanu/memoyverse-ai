import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/oauth";
import { db } from "@/lib/store";
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/settings?error=github_denied", req.url));
  try {
    const token = await exchangeCode("github", code);
    db.setToken("github", token);
    return NextResponse.redirect(new URL("/settings?connected=github", req.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(e.message)}`, req.url));
  }
}
