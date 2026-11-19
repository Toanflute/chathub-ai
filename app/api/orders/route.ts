import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { ensureWorkspaceSeed } from "@/lib/workspace-seed";

export const runtime = "nodejs";
const statuses = ["pending", "processing", "delivered", "cancelled"] as const;
const pageSizes = [10, 20, 50] as const;

export async function GET(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem đơn hàng." }, { status: 401 });
  try {
    await ensureWorkspaceSeed();
    const url = new URL(request.url);
    const rawPage = Number(url.searchParams.get("page") ?? 1);
    const rawPageSize = Number(url.searchParams.get("pageSize") ?? 20);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const query = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status") ?? "all";
    if (!pageSizes.includes(rawPageSize as (typeof pageSizes)[number])) {
      return NextResponse.json({ error: "Số đơn hàng mỗi trang không hợp lệ." }, { status: 400 });
    }
    if (status !== "all" && !statuses.includes(status as (typeof statuses)[number])) {
      return NextResponse.json({ error: "Trạng thái đơn hàng không hợp lệ." }, { status: 400 });
    }
    if (query.length > 120) return NextResponse.json({ error: "Từ khoá tìm kiếm quá dài." }, { status: 400 });
    const pageSize = rawPageSize;
    const where = {
      ...(status !== "all" ? { status } : {}),
      ...(query ? {
        OR: [
          { code: { contains: query, mode: "insensitive" as const } },
          { productName: { contains: query, mode: "insensitive" as const } },
          { category: { contains: query, mode: "insensitive" as const } },
          { contact: { name: { contains: query, mode: "insensitive" as const } } },
        ],
      } : {}),
    };

    const [orders, total, groupedCounts, orderCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { contact: { select: { id: true, name: true, phone: true, email: true } } },
        orderBy: [{ placedAt: "desc" }, { code: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.count(),
    ]);

    const counts = Object.fromEntries(groupedCounts.map((entry) => [entry.status, entry._count._all]));
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        code: order.code,
        productName: order.productName,
        quantity: order.quantity,
        category: order.category,
        workflow: order.workflow,
        total: Number(order.total),
        currency: order.currency,
        status: order.status,
        placedAt: order.placedAt.toISOString(),
        note: order.note,
        processingCode: order.processingCode,
        deliveryType: order.deliveryType,
        contactId: order.contactId,
        customerName: order.contact?.name ?? "Khách hàng đã xoá",
        customerPhone: order.contact?.phone ?? "",
      })),
      stats: {
        total: orderCount,
        pending: counts.pending ?? 0,
        processing: counts.processing ?? 0,
        delivered: counts.delivered ?? 0,
        cancelled: counts.cancelled ?? 0,
      },
      pagination: { page, pageSize, total, pageCount },
    });
  } catch (error) {
    console.error("Loading orders failed:", error);
    return NextResponse.json({ error: "Không thể tải danh sách đơn hàng." }, { status: 500 });
  }
}
