import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
type Params = { params: { id: string } };
const MAX_REPLY_LENGTH = 4000;

export async function POST(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để gửi tin nhắn." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("content" in body) || typeof body.content !== "string") {
    return NextResponse.json({ error: "Nội dung tin nhắn không hợp lệ." }, { status: 400 });
  }
  const content = body.content.trim();
  const internalNote = "internalNote" in body && body.internalNote === true;
  if (!content || content.length > MAX_REPLY_LENGTH) {
    return NextResponse.json({ error: `Tin nhắn phải có từ 1 đến ${MAX_REPLY_LENGTH} ký tự.` }, { status: 400 });
  }

  try {
    const message = await prisma.$transaction(async (transaction) => {
      const conversation = await transaction.conversation.findUnique({ where: { id: params.id }, select: { id: true } });
      if (!conversation) return null;
      const created = await transaction.message.create({
        data: { conversationId: conversation.id, role: internalNote ? "note" : "agent", content },
      });
      await transaction.conversation.update({
        where: { id: conversation.id },
        data: internalNote
          ? { updatedAt: created.createdAt }
          : { lastReadAt: created.createdAt, status: "open", archivedAt: null },
      });
      return created;
    });
    if (!message) return NextResponse.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
    return NextResponse.json({ message: { id: message.id, role: message.role, content: message.content, createdAt: message.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    console.error("Sending inbox message failed:", error);
    return NextResponse.json({ error: "Không thể gửi tin nhắn." }, { status: 500 });
  }
}
