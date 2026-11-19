import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptChannelCredentials } from "@/lib/channel-credentials";
import { isAuthenticatedRequest } from "@/lib/api-auth";

export const runtime = "nodejs";
type Params = { params: { id: string } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(_request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để kiểm tra kênh." }, { status: 401 });
  const channel = await prisma.channelConnection.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: "Không tìm thấy tài khoản kênh." }, { status: 404 });

  try {
    if (channel.platform === "chat_plugin") {
      if (!channel.enabled) return NextResponse.json({ error: "Chat Plugin đang tắt." }, { status: 409 });
    } else if (channel.platform === "discord") {
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (!botToken || !channel.externalAccountId) return NextResponse.json({ error: "Cần cấu hình bot token và đăng nhập máy chủ Discord." }, { status: 409 });
      const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(channel.externalAccountId)}`, {
        headers: { Authorization: `Bot ${botToken}` },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Discord không xác nhận máy chủ.");
    } else {
      if (!channel.credentialsEncrypted) return NextResponse.json({ error: "Kênh chưa đăng nhập nền tảng." }, { status: 409 });
      const credentials = decryptChannelCredentials(channel.credentialsEncrypted);
      if (typeof credentials.accessToken !== "string") throw new Error("Thông tin xác thực không hợp lệ.");
      let url: string;
      if (channel.platform === "telegram_bot") {
        url = `https://api.telegram.org/bot${credentials.accessToken}/getMe`;
      } else if (channel.platform === "facebook" || channel.platform === "instagram") {
        const version = process.env.META_GRAPH_VERSION || "v27.0";
        const endpoint = new URL(`https://graph.facebook.com/${version}/me`);
        endpoint.search = new URLSearchParams({ fields: "id,name", access_token: credentials.accessToken }).toString();
        url = endpoint.toString();
      } else if (channel.platform === "zalo_oa") {
        const endpoint = new URL("https://openapi.zalo.me/v3.0/oa/getoa");
        endpoint.search = new URLSearchParams({ access_token: credentials.accessToken }).toString();
        url = endpoint.toString();
      } else {
        return NextResponse.json({ error: "Loại kênh này chưa hỗ trợ kiểm tra kết nối tự động." }, { status: 409 });
      }
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || result.error || result.ok === false) throw new Error("Nền tảng không xác nhận kết nối.");
    }

    await prisma.channelConnection.update({
      where: { id: channel.id },
      data: { status: "connected", lastError: null },
    });
    return NextResponse.json({ connected: true, checkedAt: new Date().toISOString() });
  } catch {
    await prisma.channelConnection.update({
      where: { id: channel.id },
      data: { status: "error", lastError: "Không thể xác thực với nền tảng. Hãy đăng nhập lại hoặc kiểm tra quyền truy cập." },
    });
    return NextResponse.json({ error: "Không thể xác thực với nền tảng. Hãy đăng nhập lại hoặc kiểm tra quyền truy cập." }, { status: 502 });
  }
}
