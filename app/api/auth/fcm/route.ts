import { NextRequest, NextResponse } from "next/server";
import { verifyToken, sendNotification } from "@/lib/firebaseAdmin";
import { db as localDB } from "@/lib/store";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const { fcmToken, title, body } = await req.json();

  // Save FCM token for this user
  if (fcmToken) {
    const stored = localDB.getTokens() as any;
    stored.fcm = fcmToken;
    localDB.setToken("fcm" as any, fcmToken);
    return NextResponse.json({ ok: true, saved: true });
  }

  // Send notification if requested
  if (title && body) {
    const tokens = localDB.getTokens() as any;
    if (tokens.fcm) {
      const sent = await sendNotification(tokens.fcm, title, body);
      return NextResponse.json({ ok: true, sent });
    }
    return NextResponse.json({ ok: false, error: "No FCM token registered" });
  }

  return NextResponse.json({ error: "Provide fcmToken or title+body" }, { status: 400 });
}
