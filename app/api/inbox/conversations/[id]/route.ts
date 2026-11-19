import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isPrismaNotFoundError } from "@/lib/prisma-errors";

export const runtime = "nodejs";
type Params = { params: { id: string } };
const allowedStatuses = new Set(["open", "pending", "resolved", "closed", "handed_off"]);
const allowedPriorities = new Set(["Bình thường", "Cao", "Gấp"]);

export async function PATCH(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật hội thoại." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  const payload = body as Record<string, unknown>;
  const data: { status?: string; lastReadAt?: Date; archivedAt?: Date | null; assignee?: string } = {};
  const metadataPatch: Record<string, string | boolean | string[]> = {};
  if ("status" in payload) {
    if (typeof payload.status !== "string" || !allowedStatuses.has(payload.status)) {
      return NextResponse.json({ error: "Trạng thái hội thoại không hợp lệ." }, { status: 400 });
    }
    data.status = payload.status;
  }
  if (payload.read === true) data.lastReadAt = new Date();
  if (payload.archive === true) data.archivedAt = new Date();
  if (payload.archive === false) data.archivedAt = null;
  if ("assignee" in payload) {
    if (typeof payload.assignee !== "string" || payload.assignee.length > 80) return NextResponse.json({ error: "Nhân viên phụ trách không hợp lệ." }, { status: 400 });
    data.assignee = payload.assignee;
  }
  if ("labels" in payload) {
    if (!Array.isArray(payload.labels) || payload.labels.length > 12 || payload.labels.some((label) => typeof label !== "string" || label.trim().length === 0 || label.length > 40)) {
      return NextResponse.json({ error: "Nhãn hội thoại không hợp lệ." }, { status: 400 });
    }
    metadataPatch.labels = [...new Set(payload.labels.map((label) => (label as string).trim()))];
  }
  if ("team" in payload) {
    if (typeof payload.team !== "string" || payload.team.length > 80) return NextResponse.json({ error: "Đội phụ trách không hợp lệ." }, { status: 400 });
    metadataPatch.team = payload.team.trim();
  }
  if ("priority" in payload) {
    if (typeof payload.priority !== "string" || !allowedPriorities.has(payload.priority)) return NextResponse.json({ error: "Mức độ ưu tiên không hợp lệ." }, { status: 400 });
    metadataPatch.priority = payload.priority;
  }
  if ("botEnabled" in payload) {
    if (typeof payload.botEnabled !== "boolean") return NextResponse.json({ error: "Trạng thái bot không hợp lệ." }, { status: 400 });
    metadataPatch.botEnabled = payload.botEnabled;
  }
  if (Object.keys(data).length === 0 && Object.keys(metadataPatch).length === 0) {
    return NextResponse.json({ error: "Không có trường hợp hợp lệ để cập nhật." }, { status: 400 });
  }

  try {
    const conversation = Object.keys(metadataPatch).length
      ? await prisma.$transaction(async (transaction) => {
        const current = await transaction.conversation.findUnique({ where: { id: params.id } });
        if (!current) return null;
        const previousMetadata = current.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
          ? current.metadata
          : {};
        return transaction.conversation.update({
          where: { id: params.id },
          data: {
            ...data,
            metadata: { ...previousMetadata, ...metadataPatch } as Prisma.InputJsonObject,
          },
        });
      })
      : await prisma.conversation.update({ where: { id: params.id }, data });
    if (!conversation) return NextResponse.json({ error: "Không tìm thấy hội thoại." }, { status: 404 });
    return NextResponse.json({ conversation: { id: conversation.id, status: conversation.status, archivedAt: conversation.archivedAt } });
  } catch (error) {
    console.error("Updating inbox conversation failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy hội thoại." : "Không thể cập nhật hội thoại." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xoá hội thoại." }, { status: 401 });
  try {
    await prisma.conversation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deleting inbox conversation failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy hội thoại để xoá." : "Không thể xoá hội thoại." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}
