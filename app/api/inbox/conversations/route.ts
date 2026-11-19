import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isDatabaseUnavailableError, isPrismaTableMissingError } from "@/lib/prisma-errors";
import { readLocalJsonArray, updateLocalJsonArray } from "@/lib/local-json-store";
import { getSystemSettingValue } from "@/lib/system-settings";

export const runtime = "nodejs";

function mapConversation(conversation: Awaited<ReturnType<typeof loadConversations>>[number]) {
  const contact = conversation.contact;
  const metadata = conversation.metadata && typeof conversation.metadata === "object" && !Array.isArray(conversation.metadata)
    ? conversation.metadata as Record<string, unknown>
    : {};
  const latestMessage = conversation.messages[0];
  const lastReadAt = conversation.lastReadAt?.getTime() ?? 0;
  const unread = conversation.messages.filter((message) => message.role === "user" && message.createdAt.getTime() > lastReadAt).length;
  const channelMap: Record<string, string> = {
    MESSENGER: "messenger",
    WEB_CHAT: "web",
    TELEGRAM: "telegram",
    ZALO: "zalo",
  };
  const statusMap: Record<string, string> = {
    open: "Đang mở",
    pending: "Chờ xử lý",
    resolved: "Đã xong",
    closed: "Đã đóng",
    handed_off: "Chờ xử lý",
  };
  const labels = Array.isArray(metadata.labels) && metadata.labels.every((label) => typeof label === "string")
    ? metadata.labels
    : conversation.status === "handed_off" ? ["Khiếu nại"] : ["Bot"];
  const channelMapForDisplay: Record<string, string> = {
    MESSENGER: "Messenger",
    WEB_CHAT: "Website cmsnt.co",
    TELEGRAM: "Telegram",
    ZALO: "Zalo",
  };

  return {
    id: conversation.id,
    contactId: contact?.id ?? null,
    channelConnectionId: conversation.channelConnectionId,
    name: contact?.name ?? conversation.visitorId ?? "Khách hàng",
    initials: contact?.initials ?? "KH",
    avatar: contact?.avatar ?? "bg-slate-100 text-slate-700",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    order: contact?.orderNumber ?? "",
    channel: channelMap[conversation.channel] ?? "web",
    channelLabel: conversation.channelConnection?.name ?? channelMapForDisplay[conversation.channel] ?? "Website cmsnt.co",
    date: conversation.updatedAt.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    preview: latestMessage?.content ?? "Chưa có tin nhắn",
    unread,
    status: statusMap[conversation.status] ?? "Đang mở",
    labels,
    ad: metadata.ad === true,
    assignee: conversation.assignee ?? "Chưa gán",
    team: typeof metadata.team === "string" ? metadata.team : "Chưa phân công",
    priority: typeof metadata.priority === "string" ? metadata.priority : "Bình thường",
    botEnabled: typeof metadata.botEnabled === "boolean" ? metadata.botEnabled : conversation.status !== "handed_off",
    contactTag: contact?.tag ?? "",
    balance: contact ? Number(contact.balance) : 0,
    address: contact?.address ?? "",
    activity: contact?.activity ?? 0,
    notes: contact?.notes ?? [],
    messages: [...conversation.messages].reverse().map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

async function loadConversations(includeArchived = false) {
  return prisma.conversation.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
    include: {
      contact: true,
      channelConnection: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 100 },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function GET(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem hộp thư." }, { status: 401 });
  try {
    const url = new URL(request.url);
    const conversations = await loadConversations(url.searchParams.get("includeArchived") === "true");
    return NextResponse.json({ conversations: conversations.map(mapConversation) });
  } catch (error) {
    console.error("Loading inbox conversations failed; using local storage:", error);
    try {
      const conversations = await readLocalJsonArray<Record<string, unknown>>("inbox-conversations.json");
      return NextResponse.json({ conversations });
    } catch (storageError) {
      console.error("Loading local inbox conversations failed:", storageError);
      return NextResponse.json({ conversations: [] });
    }
  }
}

export async function PATCH() {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật hộp thư." }, { status: 401 });
  try {
    const result = await prisma.conversation.updateMany({ where: { archivedAt: null }, data: { lastReadAt: new Date() } });
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Marking inbox conversations read failed:", error);
    if (isPrismaTableMissingError(error) || isDatabaseUnavailableError(error)) {
      try {
        const updated = await updateLocalJsonArray<Record<string, unknown>, number>("inbox-conversations.json", (conversations) => {
          let count = 0;
          const values = conversations.map((conversation) => {
            if (!conversation.unread) return conversation;
            count += 1;
            return { ...conversation, unread: 0, lastReadAt: new Date().toISOString() };
          });
          return { values, result: count };
        });
        return NextResponse.json({ updated, storage: "local" });
      } catch (storageError) {
        console.error("Marking local inbox conversations read failed:", storageError);
      }
    }
    return NextResponse.json({ error: "Không thể đánh dấu hội thoại đã đọc." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để tạo hội thoại." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || !("contactId" in body) || typeof body.contactId !== "string" || !body.contactId.trim()) {
    return NextResponse.json({ error: "Liên hệ không hợp lệ." }, { status: 400 });
  }
  try {
    const contact = await prisma.contact.findUnique({ where: { id: body.contactId.trim() } });
    if (!contact) return NextResponse.json({ error: "Không tìm thấy liên hệ." }, { status: 404 });
    const defaultStatus = await getSystemSettingValue("general", "defaultConversationStatus");
    let channelConnection: { id: string } | null = null;
    try {
      channelConnection = await prisma.channelConnection.findFirst({ where: { platform: "chat_plugin" }, select: { id: true } });
    } catch (error) {
      if (!isPrismaTableMissingError(error)) throw error;
    }
    const conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        channel: "WEB_CHAT",
        channelConnectionId: channelConnection?.id,
        status: defaultStatus === "Đang chờ" ? "pending" : defaultStatus === "Đã đóng" ? "closed" : "open",
        assignee: "Chưa gán",
      },
    });
    return NextResponse.json({ conversation: { id: conversation.id, contactId: contact.id } }, { status: 201 });
  } catch (error) {
    console.error("Creating inbox conversation failed:", error);
    if (isPrismaTableMissingError(error) || isDatabaseUnavailableError(error)) {
      try {
        const now = new Date();
        const conversation = {
          id: `local-${randomUUID()}`,
          contactId: body.contactId.trim(),
          channelConnectionId: null,
          name: "Khách hàng",
          initials: "KH",
          avatar: "bg-slate-100 text-slate-700",
          email: "",
          phone: "",
          order: "",
          channel: "web",
          channelLabel: "Website cmsnt.co",
          date: now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          preview: "Chưa có tin nhắn",
          unread: 0,
          status: "Đang mở",
          labels: ["Bot"],
          ad: false,
          assignee: "Chưa gán",
          team: "Chưa phân công",
          priority: "Bình thường",
          botEnabled: true,
          contactTag: "",
          balance: 0,
          address: "",
          activity: 0,
          notes: [],
          messages: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        await updateLocalJsonArray<Record<string, unknown>, void>("inbox-conversations.json", (conversations) => ({
          values: [conversation, ...conversations],
          result: undefined,
        }));
        return NextResponse.json({ conversation: { id: conversation.id, contactId: conversation.contactId }, storage: "local" }, { status: 201 });
      } catch (storageError) {
        console.error("Saving local inbox conversation failed:", storageError);
      }
    }
    return NextResponse.json({ error: "Không thể tạo hội thoại." }, { status: 500 });
  }
}
