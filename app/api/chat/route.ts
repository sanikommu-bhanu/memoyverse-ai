import { NextRequest, NextResponse } from "next/server";
import { ragChat } from "@/lib/rag";
import { getChat, addChat, clearChat } from "@/lib/hybridStore";
import { verifyToken } from "@/lib/firebaseAdmin";
import { ChatMsg } from "@/lib/types";

export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "No question" }, { status: 400 });
  const userMsg: ChatMsg = { id: `u${Date.now()}`, role: "user", content: question, at: new Date().toISOString() };
  await addChat(userMsg, uid);
  try {
    const { answer, sources } = await ragChat(question, uid);
    const aMsg: ChatMsg = { id: `a${Date.now()}`, role: "assistant", content: answer, sources, at: new Date().toISOString() };
    await addChat(aMsg, uid);
    return NextResponse.json({ answer, sources, msg: aMsg });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  return NextResponse.json({ chat: await getChat(uid) });
}
export async function DELETE(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
  await clearChat(uid);
  return NextResponse.json({ ok: true });
}
