import { NextRequest, NextResponse } from "next/server";
import { getDocs, delDoc, wipeAll } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  return NextResponse.json({ docs: await getDocs(uid) });
}

export async function DELETE(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const body = await req.json();
  if (body.id === "__ALL__") { await wipeAll(uid); return NextResponse.json({ ok: true }); }
  if (!body.id) return NextResponse.json({ error: "No id" }, { status: 400 });
  await delDoc(body.id, uid);
  return NextResponse.json({ ok: true });
}
