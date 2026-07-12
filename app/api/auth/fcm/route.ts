import { NextRequest, NextResponse } from "next/server";
import { verifyToken, sendNotification } from "@/lib/firebaseAdmin";
import { getProfile, setProfile } from "@/lib/hybridStore";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const { fcmToken, title, body } = await req.json();

  // Save FCM token for this user
  if (fcmToken) {
    const p = (await getProfile(uid)) || { name: "", email: "", title: "", location: "", bio: "" };
    p.fcmToken = fcmToken;
    await setProfile(p, uid);
    return NextResponse.json({ ok: true, saved: true });
  }

  // Send notification if requested
  if (title && body) {
    const p = await getProfile(uid);
    if (p?.fcmToken) {
      const sent = await sendNotification(p.fcmToken, title, body);
      return NextResponse.json({ ok: true, sent });
    }
    return NextResponse.json({ ok: false, error: "No FCM token registered for this user" });
  }

  return NextResponse.json({ error: "Provide fcmToken or title+body" }, { status: 400 });
}
