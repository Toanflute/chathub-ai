import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { appointmentStatuses } from "@/lib/appointment-config";
import { appointmentServices, appointmentStaff } from "@/lib/appointment-config";

export const runtime = "nodejs";
type Params = { params: { id: string } };
const endedStatuses = ["completed", "cancelled"];
const MAX_NOTE_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật lịch hẹn." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!isRecord(body)) return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });

  if ("status" in body) {
    if (typeof body.status !== "string" || !appointmentStatuses.includes(body.status as (typeof appointmentStatuses)[number])) {
      return NextResponse.json({ error: "Trạng thái lịch hẹn không hợp lệ." }, { status: 400 });
    }
    try {
      const appointment = await prisma.appointment.update({
        where: { id: params.id },
        data: { status: body.status },
        select: { id: true, status: true },
      });
      return NextResponse.json(appointment);
    } catch (error) {
      const notFound = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
      console.error("Updating appointment status failed:", error);
      return NextResponse.json({ error: notFound ? "Không tìm thấy lịch hẹn." : "Không thể cập nhật lịch hẹn." }, { status: notFound ? 404 : 500 });
    }
  }

  if (typeof body.note !== "string" || body.note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự.` }, { status: 400 });
  }
  if (typeof body.customerId !== "string" || !body.customerId) return NextResponse.json({ error: "Vui lòng chọn khách hàng." }, { status: 400 });
  if (typeof body.serviceName !== "string" || !appointmentServices.some((service) => service.name === body.serviceName)) {
    return NextResponse.json({ error: "Dịch vụ không hợp lệ." }, { status: 400 });
  }
  if (typeof body.assignedTo !== "string" || !appointmentStaff.includes(body.assignedTo as (typeof appointmentStaff)[number])) {
    return NextResponse.json({ error: "Người phụ trách không hợp lệ." }, { status: 400 });
  }
  if (typeof body.startsAt !== "string" || !Number.isFinite(Date.parse(body.startsAt))) {
    return NextResponse.json({ error: "Ngày giờ hẹn không hợp lệ." }, { status: 400 });
  }
  const customerId = body.customerId;
  const serviceName = body.serviceName;
  const assignedTo = body.assignedTo;
  const note = body.note;
  const service = appointmentServices.find((item) => item.name === serviceName);
  if (!service) return NextResponse.json({ error: "Dịch vụ không hợp lệ." }, { status: 400 });
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60_000);

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.appointment.findUnique({ where: { id: params.id } });
      if (!current) return { kind: "not-found" as const };
      const customer = await transaction.contact.findUnique({ where: { id: customerId }, select: { id: true } });
      if (!customer) return { kind: "customer-not-found" as const };
      if (!endedStatuses.includes(current.status)) {
        const conflict = await transaction.appointment.findFirst({
          where: {
            id: { not: current.id },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
            status: { notIn: endedStatuses },
            ...(assignedTo === "Ai cũng được" ? {} : { assignedTo: { in: [assignedTo, "Ai cũng được"] } }),
          },
        });
        if (conflict) return { kind: "conflict" as const };
      }
      const appointment = await transaction.appointment.update({
        where: { id: current.id },
        data: {
          customerId,
          serviceName,
          assignedTo,
          startsAt,
          endsAt,
          durationMinutes: service.durationMinutes,
          note: note.trim(),
        },
        select: { id: true, status: true },
      });
      return { kind: "updated" as const, appointment };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.kind !== "updated") {
      const status = result.kind === "not-found" ? 404 : result.kind === "conflict" ? 409 : 404;
      const error = result.kind === "not-found" ? "Không tìm thấy lịch hẹn." : result.kind === "conflict" ? "Khung giờ vừa được đặt. Vui lòng chọn giờ khác." : "Không tìm thấy khách hàng.";
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json(result.appointment);
  } catch (error) {
    console.error("Updating appointment failed:", error);
    const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    return NextResponse.json({ error: conflict ? "Khung giờ vừa được đặt. Vui lòng thử lại." : "Không thể cập nhật lịch hẹn." }, { status: conflict ? 409 : 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xoá lịch hẹn." }, { status: 401 });
  try {
    await prisma.appointment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const notFound = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
    console.error("Deleting appointment failed:", error);
    return NextResponse.json({ error: notFound ? "Không tìm thấy lịch hẹn." : "Không thể xoá lịch hẹn." }, { status: notFound ? 404 : 500 });
  }
}
