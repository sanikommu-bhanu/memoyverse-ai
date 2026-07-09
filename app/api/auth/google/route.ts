import { NextResponse } from "next/server";
import { buildAuthUrl, OAUTH } from "@/lib/oauth";
export async function GET() {
  if (!OAUTH.google.clientId) return NextResponse.json({ error: "GOOGLE_CLIENT_ID not set in .env", setup: true }, { status: 400 });
  return NextResponse.redirect(buildAuthUrl("google"));
}
