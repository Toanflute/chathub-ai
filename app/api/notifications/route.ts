import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isDatabaseUnavailableError, isPrismaNotFoundError, isPrismaTableMissingError } from "@/lib/prisma-errors";
import { readLocalJsonArray, updateLocalJsonArray } from "@/lib/local-json-store";

export const runtime = "nodejs";
const DAY = 24 * 60 * 60 * 1000;

function relativeTime(date: Date) {
  const elapsed = Math.max(0, Date.now() - date.getTime());
  const days = Math.floor(elapsed / DAY);
  if (days >= 1) return `${days} ngày trước`;
  const hours = Math.floor(elapsed / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} giờ trước`;
  const minutes = Math.floor(elapsed / (60 * 1000));
  return minutes >= 1 ? `${minutes} phút trước` : "Vừa xong";
}

export async function GET() {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem thông báo." }, { status: 401 });
  try {
    const notifications = await prisma.notification.findMany({ orderBy: { createdAt: "desc" } });
    const items = notifications.map((notification) => ({
      id: notification.id,
      channel: notification.channel,
      title: notification.title,
      message: notification.message,
      time: relativeTime(notification.createdAt),
      unread: !notification.isRead,
    }));
    return NextResponse.json({ notifications: items, unreadCount: items.filter((item) => item.unread).length });
  } catch (error) {
    console.error("Loading notifications failed; using local storage:", error);
    try {
      const notifications = await readLocalJsonArray<{
        id: string;
        channel: string;
        title: string;
        message: string;
        isRead: boolean;
        createdAt: string;
      }>("notifications.json");
      const items = notifications.map((notification) => ({
        id: notification.id,
        channel: notification.channel,
        title: notification.title,
        message: notification.message,
        time: relativeTime(new Date(notification.createdAt)),
        unread: !notification.isRead,
      }));
      return NextResponse.json({ notifications: items, unreadCount: items.filter((item) => item.unread).length });
    } catch (storageError) {
      console.error("Loading local notifications failed:", storageError);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }
  }
}

export async function PATCH(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật thông báo." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Dữ liệu cập nhật không hợp lệ." }, { status: 400 });
  const payload = body as Record<string, unknown>;

  try {
    if (payload.readAll === true) {
      const result = await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
      return NextResponse.json({ updated: result.count });
    }
    if (typeof payload.id !== "string") return NextResponse.json({ error: "Thông báo cần cập nhật không hợp lệ." }, { status: 400 });
    const notification = await prisma.notification.update({ where: { id: payload.id }, data: { isRead: true } });
    return NextResponse.json({ id: notification.id, unread: !notification.isRead });
  } catch (error) {
    console.error("Updating notification failed:", error);
    try {
      if (payload.readAll === true) {
        const updated = await updateLocalJsonArray<{
          id: string;
          isRead: boolean;
        }, number>("notifications.json", (notifications) => {
          let count = 0;
          const values = notifications.map((notification) => {
            if (notification.isRead) return notification;
            count += 1;
            return { ...notification, isRead: true };
          });
          return { values, result: count };
        });
        return NextResponse.json({ updated, storage: "local" });
      }
      if (typeof payload.id !== "string") return NextResponse.json({ error: "Thông báo cần cập nhật không hợp lệ." }, { status: 400 });
      const notification = await updateLocalJsonArray<{
        id: string;
        isRead: boolean;
      }, { id: string; isRead: boolean } | null>("notifications.json", (notifications) => {
        let updated: { id: string; isRead: boolean } | null = null;
        const values = notifications.map((item) => {
          if (item.id !== payload.id) return item;
          updated = { id: item.id, isRead: true };
          return { ...item, isRead: true };
        });
        return { values, result: updated };
      });
      return notification
        ? NextResponse.json({ id: notification.id, unread: !notification.isRead, storage: "local" })
        : NextResponse.json({ error: "Không tìm thấy thông báo." }, { status: 404 });
    } catch (storageError) {
      console.error("Updating local notification failed:", storageError);
    }
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy thông báo." : isPrismaTableMissingError(error) || isDatabaseUnavailableError(error) ? "Không thể lưu thay đổi vào kho cục bộ." : "Không thể cập nhật thông báo." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xoá thông báo." }, { status: 401 });
  let id: string | null;
  try {
    id = new URL(request.url).searchParams.get("id");
  } catch {
    return NextResponse.json({ error: "URL yêu cầu không hợp lệ." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Thiếu mã thông báo." }, { status: 400 });
  try {
    await prisma.notification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deleting notification failed:", error);
    try {
      const deleted = await updateLocalJsonArray<{ id: string }, boolean>("notifications.json", (notifications) => {
        const values = notifications.filter((notification) => notification.id !== id);
        return { values, result: values.length !== notifications.length };
      });
      return deleted
        ? NextResponse.json({ success: true, storage: "local" })
        : NextResponse.json({ error: "Không tìm thấy thông báo để xoá." }, { status: 404 });
    } catch (storageError) {
      console.error("Deleting local notification failed:", storageError);
    }
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy thông báo để xoá." : isPrismaTableMissingError(error) || isDatabaseUnavailableError(error) ? "Không thể lưu thay đổi vào kho cục bộ." : "Không thể xoá thông báo." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}
