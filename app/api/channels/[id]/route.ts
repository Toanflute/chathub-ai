import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isPrismaNotFoundError } from "@/lib/prisma-errors";
import { deleteLocalChannel, getLocalChannels, updateLocalChannel } from "@/lib/local-channel-store";

export const runtime = "nodejs";
type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật kênh." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Thông tin cập nhật không hợp lệ." }, { status: 400 });

  const payload = body as Record<string, unknown>;
  const data: { name?: string; enabled?: boolean; groupSync?: boolean; groups?: string[] } = {};
  if ("name" in payload) {
    if (typeof payload.name !== "string" || !payload.name.trim() || payload.name.trim().length > 100) {
      return NextResponse.json({ error: "Tên kênh phải có từ 1 đến 100 ký tự." }, { status: 400 });
    }
    data.name = payload.name.trim();
  }
  if ("enabled" in payload) {
    if (typeof payload.enabled !== "boolean") return NextResponse.json({ error: "Trạng thái kênh không hợp lệ." }, { status: 400 });
    data.enabled = payload.enabled;
  }
  if ("groupSync" in payload) {
    if (typeof payload.groupSync !== "boolean") return NextResponse.json({ error: "Trạng thái đồng bộ nhóm không hợp lệ." }, { status: 400 });
    data.groupSync = payload.groupSync;
  }
  if ("groups" in payload) {
    if (!Array.isArray(payload.groups) || payload.groups.length > 50 || payload.groups.some((group) => typeof group !== "string" || group.trim().length > 100)) {
      return NextResponse.json({ error: "Danh sách nhóm không hợp lệ." }, { status: 400 });
    }
    data.groups = [...new Set(payload.groups.map((group) => group.trim()).filter(Boolean))];
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Không có thông tin hợp lệ để cập nhật." }, { status: 400 });

  try {
    const localChannel = (await getLocalChannels()).find((channel) => channel.id === params.id);
    if (localChannel) {
      const channel = await updateLocalChannel(params.id, data);
      if (!channel) return NextResponse.json({ error: "Không tìm thấy tài khoản kênh." }, { status: 404 });
      return NextResponse.json({ channel: { ...channel, type: channel.platform, isActive: channel.enabled } });
    }
    const channel = await prisma.channelConnection.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        code: true,
        name: true,
        platform: true,
        status: true,
        enabled: true,
        groupSync: true,
        groups: true,
        externalAccountId: true,
        connectedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ channel });
  } catch (error) {
    console.error("Updating channel connection failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy tài khoản kênh." : "Không thể cập nhật tài khoản kênh." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xoá kênh." }, { status: 401 });
  try {
    const localChannel = (await getLocalChannels()).find((channel) => channel.id === params.id);
    if (localChannel) {
      await deleteLocalChannel(params.id);
      return NextResponse.json({ success: true });
    }
    await prisma.channelConnection.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deleting channel connection failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy tài khoản kênh." : "Không thể xoá tài khoản kênh." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}
