import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isPrismaNotFoundError } from "@/lib/prisma-errors";

export const runtime = "nodejs";
type Params = { params: { id: string } };
const MAX_NOTE_LENGTH = 4000;
const cancellableStatuses = ["pending", "processing"];

export async function PATCH(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật đơn hàng." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  if ("note" in payload && "action" in payload) {
    return NextResponse.json({ error: "Chỉ được thực hiện một thao tác trên mỗi yêu cầu." }, { status: 400 });
  }

  if ("note" in payload) {
    if (typeof payload.note !== "string" || payload.note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json({ error: `Ghi chú phải là chuỗi tối đa ${MAX_NOTE_LENGTH} ký tự.` }, { status: 400 });
    }
    try {
      const order = await prisma.order.update({
        where: { id: params.id },
        data: { note: payload.note.trim() },
        select: { id: true, note: true, updatedAt: true },
      });
      return NextResponse.json({ order });
    } catch (error) {
      console.error("Updating order note failed:", error);
      return NextResponse.json(
        { error: isPrismaNotFoundError(error) ? "Không tìm thấy đơn hàng." : "Không thể lưu ghi chú." },
        { status: isPrismaNotFoundError(error) ? 404 : 500 },
      );
    }
  }

  if (payload.action === "deliver") {
    try {
      const updated = await prisma.order.updateMany({
        where: { id: params.id, status: { in: cancellableStatuses } },
        data: { status: "delivered" },
      });
      if (updated.count === 0) {
        const order = await prisma.order.findUnique({ where: { id: params.id }, select: { id: true } });
        return NextResponse.json(
          { error: order ? "Chỉ có thể giao đơn đang chờ hoặc đang xử lý." : "Không tìm thấy đơn hàng." },
          { status: order ? 409 : 404 },
        );
      }
      return NextResponse.json({ order: await prisma.order.findUnique({ where: { id: params.id }, select: { id: true, status: true } }) });
    } catch (error) {
      console.error("Delivering order failed:", error);
      return NextResponse.json({ error: "Không thể duyệt và giao đơn hàng." }, { status: 500 });
    }
  }

  if (payload.action === "cancel") {
    try {
      const result = await prisma.$transaction(async (transaction) => {
        const order = await transaction.order.findUnique({ where: { id: params.id } });
        if (!order) return { kind: "not-found" as const };
        if (!cancellableStatuses.includes(order.status)) return { kind: "conflict" as const };

        const updated = await transaction.order.updateMany({
          where: { id: order.id, status: { in: cancellableStatuses } },
          data: { status: "cancelled" },
        });
        if (updated.count === 0) return { kind: "conflict" as const };
        if (order.contactId) {
          await transaction.contact.update({
            where: { id: order.contactId },
            data: { balance: { increment: order.total } },
          });
        }
        return { kind: "cancelled" as const };
      });
      if (result.kind !== "cancelled") {
        return NextResponse.json(
          { error: result.kind === "not-found" ? "Không tìm thấy đơn hàng." : "Chỉ có thể huỷ đơn đang chờ hoặc đang xử lý." },
          { status: result.kind === "not-found" ? 404 : 409 },
        );
      }
      return NextResponse.json({ id: params.id, status: "cancelled", refunded: true });
    } catch (error) {
      console.error("Cancelling order failed:", error);
      return NextResponse.json({ error: "Không thể huỷ đơn và hoàn tiền." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Thao tác đơn hàng không hợp lệ." }, { status: 400 });
}
