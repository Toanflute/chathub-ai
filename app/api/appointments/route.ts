import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { ensureWorkspaceSeed } from "@/lib/workspace-seed";
import { appointmentServices, appointmentStaff } from "@/lib/appointment-config";

export const runtime = "nodejs";
const endedStatuses = ["completed", "cancelled"];
const MAX_NOTE_LENGTH = 2000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSchedule(value: unknown) {
  if (!isRecord(value)) return { error: "Thông tin lịch hẹn không hợp lệ." };
  const { customerId, serviceName, assignedTo, startsAt, note } = value;
  if (typeof customerId !== "string" || !customerId) return { error: "Vui lòng chọn khách hàng." };
  if (typeof serviceName !== "string" || !appointmentServices.some((service) => service.name === serviceName)) {
    return { error: "Dịch vụ không hợp lệ." };
  }
  if (typeof assignedTo !== "string" || !appointmentStaff.includes(assignedTo as (typeof appointmentStaff)[number])) {
    return { error: "Người phụ trách không hợp lệ." };
  }
  if (typeof startsAt !== "string" || startsAt.length > 40 || !Number.isFinite(Date.parse(startsAt))) {
    return { error: "Ngày giờ hẹn không hợp lệ." };
  }
  if (typeof note !== "string" || note.length > MAX_NOTE_LENGTH) return { error: `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự.` };
  const service = appointmentServices.find((item) => item.name === serviceName);
  return {
    data: {
      customerId,
      serviceName,
      assignedTo,
      startsAt: new Date(startsAt),
      endsAt: new Date(Date.parse(startsAt) + service!.durationMinutes * 60_000),
      durationMinutes: service!.durationMinutes,
      note: note.trim(),
    },
  };
}

function overlapWhere(data: { startsAt: Date; endsAt: Date; assignedTo: string }, excludeId?: string) {
  return {
    ...(excludeId ? { id: { not: excludeId } } : {}),
    startsAt: { lt: data.endsAt },
    endsAt: { gt: data.startsAt },
    status: { notIn: endedStatuses },
    ...(data.assignedTo === "Ai cũng được" ? {} : { assignedTo: { in: [data.assignedTo, "Ai cũng được"] } }),
  };
}

export async function GET(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem lịch hẹn." }, { status: 401 });
  const url = new URL(request.url);
  const start = new Date(url.searchParams.get("start") ?? "");
  const end = new Date(url.searchParams.get("end") ?? "");
  const staff = url.searchParams.get("staff") ?? "all";
  const includeEnded = url.searchParams.get("includeEnded") === "true";
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 62 * 86_400_000) {
    return NextResponse.json({ error: "Khoảng ngày lịch hẹn không hợp lệ." }, { status: 400 });
  }
  if (staff !== "all" && !appointmentStaff.includes(staff as (typeof appointmentStaff)[number])) {
    return NextResponse.json({ error: "Nhân viên không hợp lệ." }, { status: 400 });
  }
  try {
    await ensureWorkspaceSeed();
    const where = {
      startsAt: { lt: end },
      endsAt: { gt: start },
      ...(staff !== "all" ? { assignedTo: staff } : {}),
      ...(!includeEnded ? { status: { notIn: endedStatuses } } : {}),
    };
    const [appointments, groupedCounts] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true, initials: true } } },
        orderBy: { startsAt: "asc" },
      }),
      prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(groupedCounts.map((entry) => [entry.status, entry._count._all]));
    return NextResponse.json({
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        customerId: appointment.customerId,
        customerName: appointment.customer?.name ?? "Khách hàng đã xoá",
        customerPhone: appointment.customer?.phone ?? "",
        customerInitials: appointment.customer?.initials ?? "KH",
        serviceName: appointment.serviceName,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        durationMinutes: appointment.durationMinutes,
        assignedTo: appointment.assignedTo,
        status: appointment.status,
        note: appointment.note,
      })),
      stats: {
        total: Object.values(counts).reduce((sum, count) => sum + count, 0),
        pending: counts.pending ?? 0,
        confirmed: counts.confirmed ?? 0,
      },
    });
  } catch (error) {
    console.error("Loading appointments failed:", error);
    return NextResponse.json({ error: "Không thể tải lịch hẹn." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để đặt lịch." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  const parsed = parseSchedule(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const created = await prisma.$transaction(async (transaction) => {
      const customer = await transaction.contact.findUnique({ where: { id: parsed.data.customerId }, select: { id: true } });
      if (!customer) return { kind: "customer-not-found" as const };
      const conflict = await transaction.appointment.findFirst({ where: overlapWhere(parsed.data) });
      if (conflict) return { kind: "conflict" as const };
      const appointment = await transaction.appointment.create({ data: parsed.data });
      return { kind: "created" as const, appointment };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (created.kind !== "created") {
      return NextResponse.json(
        { error: created.kind === "conflict" ? "Khung giờ vừa được đặt. Vui lòng chọn giờ khác." : "Không tìm thấy khách hàng." },
        { status: created.kind === "conflict" ? 409 : 404 },
      );
    }
    return NextResponse.json({ id: created.appointment.id, status: created.appointment.status }, { status: 201 });
  } catch (error) {
    console.error("Creating appointment failed:", error);
    return NextResponse.json(
      { error: error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" ? "Khung giờ vừa được đặt. Vui lòng thử lại." : "Không thể đặt lịch hẹn." },
      { status: error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" ? 409 : 500 },
    );
  }
}
