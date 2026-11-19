import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isPrismaConflictError, isPrismaTableMissingError } from "@/lib/prisma-errors";
import { createLocalChannel, getLocalChannels } from "@/lib/local-channel-store";
import { getSystemSecret, getSystemSettingValue } from "@/lib/system-settings";

export const runtime = "nodejs";

const platforms = new Set([
  "zalo_personal",
  "zalo_oa",
  "telegram_personal",
  "telegram_bot",
  "facebook",
  "instagram",
  "chat_plugin",
  "discord",
]);
const platformPrefixes: Record<string, string> = {
  zalo_personal: "ch-zp",
  zalo_oa: "ch-zalo",
  telegram_personal: "ch-tg",
  telegram_bot: "ch-tgb",
  facebook: "ch-fb",
  instagram: "ch-ig",
  chat_plugin: "ch-web",
  discord: "ch-dc",
};

async function listChannels() {
  const channels = await prisma.channelConnection.findMany({ orderBy: { createdAt: "asc" } });
  let conversations: { channelConnectionId: string | null; updatedAt: Date; _count: { messages: number } }[] = [];
  if (channels.length) {
    try {
      conversations = await prisma.conversation.findMany({
        where: { channelConnectionId: { in: channels.map((channel) => channel.id) } },
        select: { channelConnectionId: true, updatedAt: true, _count: { select: { messages: true } } },
      });
    } catch (error) {
      if (!isPrismaTableMissingError(error)) throw error;
    }
  }
  return channels.map(({ credentialsEncrypted: _credentialsEncrypted, ...channel }) => {
    const channelConversations = conversations.filter((conversation) => conversation.channelConnectionId === channel.id);
    return {
      ...channel,
      type: channel.platform,
      provider: channel.platform,
      isActive: channel.enabled,
      lastSignal: channelConversations.reduce<Date | null>(
        (latest, conversation) => !latest || conversation.updatedAt > latest ? conversation.updatedAt : latest,
        channel.connectedAt,
      ),
      conversationCount: channelConversations.length,
      messageCount: channelConversations.reduce((total, conversation) => total + conversation._count.messages, 0),
    };
  });
}

async function loadChannelSettings() {
  const [facebookAppId, telegramApiId, facebookAppSecret, telegramApiHash] = await Promise.all([
    getSystemSettingValue("channels", "facebookAppId"),
    getSystemSettingValue("channels", "telegramApiId"),
    getSystemSecret("channels", "facebookAppSecret"),
    getSystemSecret("channels", "telegramApiHash"),
  ]);
  return {
    facebookAppId: (typeof facebookAppId === "string" && facebookAppId.trim().length > 0) || Boolean(process.env.META_APP_ID),
    facebookAppSecret: Boolean(facebookAppSecret) || Boolean(process.env.META_APP_SECRET),
    telegramApiId: typeof telegramApiId === "string" && telegramApiId.trim().length > 0,
    telegramApiHash: Boolean(telegramApiHash),
  };
}

function configurationFor(platform: string, configuration: Awaited<ReturnType<typeof loadChannelSettings>>, channelStatus: string) {
  if (platform === "facebook" || platform === "instagram") {
    const ready = configuration.facebookAppId && configuration.facebookAppSecret;
    return { configurationReady: ready, configurationMessage: ready ? "Thông tin ứng dụng đã sẵn sàng. Đăng nhập để liên kết tài khoản." : "Cần App ID và App Secret trong Cài đặt → Kênh.", settingsUrl: "/settings?tab=channels" };
  }
  if (platform === "telegram_personal") {
    const ready = configuration.telegramApiId && configuration.telegramApiHash;
    return { configurationReady: ready, configurationMessage: ready ? "Đã lưu API ID và API Hash. Nền tảng chưa hỗ trợ luồng đăng nhập tin nhắn cá nhân trong ứng dụng." : "Cần API ID và API Hash trong Cài đặt → Kênh.", settingsUrl: "/settings?tab=channels" };
  }
  if (platform === "telegram_bot") {
    const ready = channelStatus === "connected";
    return { configurationReady: ready, configurationMessage: ready ? "Bot đã được xác minh." : "Nhập và xác minh Bot Token trong cấu hình kênh.", settingsUrl: "/settings?tab=channels" };
  }
  if (platform === "zalo_oa") {
    const ready = Boolean(process.env.ZALO_OA_APP_ID && process.env.ZALO_OA_APP_SECRET);
    return { configurationReady: ready, configurationMessage: ready ? "Ứng dụng Zalo OA đã sẵn sàng để đăng nhập." : "Cần cấu hình ứng dụng Zalo OA trên máy chủ.", settingsUrl: "/settings?tab=channels" };
  }
  if (platform === "discord") {
    const ready = Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_BOT_TOKEN);
    return { configurationReady: ready, configurationMessage: ready ? "Ứng dụng Discord đã sẵn sàng để đăng nhập." : "Cần cấu hình ứng dụng Discord trên máy chủ.", settingsUrl: "/settings?tab=channels" };
  }
  if (platform === "chat_plugin") {
    return { configurationReady: true, configurationMessage: "Chat Plugin đã sẵn sàng để nhúng vào website.", settingsUrl: "/settings?tab=channels" };
  }
  return { configurationReady: false, configurationMessage: "Nền tảng này không cung cấp API đăng nhập tin nhắn cá nhân chính thức.", settingsUrl: "/settings?tab=channels" };
}

function withConfiguration<T extends { platform: string; status: string }>(channel: T, configuration: Awaited<ReturnType<typeof loadChannelSettings>>) {
  return { ...channel, ...configurationFor(channel.platform, configuration, channel.status) };
}

function localChannelResponse(channel: Awaited<ReturnType<typeof getLocalChannels>>[number], configuration: Awaited<ReturnType<typeof loadChannelSettings>>) {
  return {
    ...channel,
    type: channel.platform,
    provider: channel.platform,
    isActive: channel.enabled,
    lastSignal: channel.connectedAt,
    conversationCount: 0,
    messageCount: 0,
    ...configurationFor(channel.platform, configuration, channel.status),
  };
}

export async function GET() {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem kênh." }, { status: 401 });
  let localChannels: Awaited<ReturnType<typeof getLocalChannels>> = [];
  try {
    localChannels = await getLocalChannels();
  } catch (error) {
    console.error("Loading local channel connections failed:", error);
  }
  let configuration = { facebookAppId: false, facebookAppSecret: false, telegramApiId: false, telegramApiHash: false };
  try {
    configuration = await loadChannelSettings();
  } catch (error) {
    console.error("Loading channel platform settings failed:", error);
  }
  try {
    const channels = await listChannels();
    const databaseIds = new Set(channels.map((channel) => channel.id));
    const local = localChannels.filter((channel) => !databaseIds.has(channel.id)).map((channel) => localChannelResponse(channel, configuration));
    return NextResponse.json({ channels: [...channels.map((channel) => withConfiguration(channel, configuration)), ...local] });
  } catch (error) {
    console.error("Loading database channel connections failed; using local storage:", error);
    return NextResponse.json({ channels: localChannels.map((channel) => localChannelResponse(channel, configuration)) });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để thêm kênh." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Thông tin kênh không hợp lệ." }, { status: 400 });
  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const platform = payload.platform ?? payload.type ?? payload.provider;
  if (!name || name.length > 100) return NextResponse.json({ error: "Tên kênh phải có từ 1 đến 100 ký tự." }, { status: 400 });
  if (typeof platform !== "string" || !platforms.has(platform)) return NextResponse.json({ error: "Loại kênh không hợp lệ." }, { status: 400 });
  const prefix = platformPrefixes[platform];
  let configuration = { facebookAppId: false, facebookAppSecret: false, telegramApiId: false, telegramApiHash: false };
  try {
    configuration = await loadChannelSettings();
  } catch (error) {
    console.error("Loading platform settings before channel creation failed:", error);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const existing = await prisma.channelConnection.findMany({
        where: { code: { startsWith: `${prefix}-` } },
        select: { code: true },
      });
      const usedCodes = new Set(existing.map((channel) => channel.code));
      let sequence = 1;
      while (usedCodes.has(`${prefix}-${String(sequence).padStart(2, "0")}`)) sequence += 1;
      const channel = await prisma.channelConnection.create({
        data: {
          code: `${prefix}-${String(sequence).padStart(2, "0")}`,
          name,
          platform,
          status: "needs_config",
          enabled: true,
        },
      });
      const created = {
        ...channel,
        type: channel.platform,
        provider: channel.platform,
        isActive: channel.enabled,
        authMode: channel.platform === "zalo_personal" ? "qr" : "manual",
        ...configurationFor(channel.platform, configuration, channel.status),
      };
      return NextResponse.json({ channel: created, ...created }, { status: 201 });
    } catch (error) {
      if (isPrismaConflictError(error) && attempt < 2) continue;
      if (isPrismaConflictError(error)) {
        console.error("Creating channel connection failed because its code conflicts:", error);
        return NextResponse.json({ error: "Mã tài khoản kênh đang được sử dụng. Hãy thử lại." }, { status: 409 });
      }
      console.error("Creating channel connection failed; saving locally:", error);
      try {
        const channel = await createLocalChannel(name, platform, false);
        const created = {
          ...channel,
          type: channel.platform,
          provider: channel.platform,
          isActive: channel.enabled,
          ...configurationFor(channel.platform, configuration, channel.status),
        };
        return NextResponse.json({ channel: created, ...created }, { status: 201 });
      } catch (storageError) {
        console.error("Saving channel connection locally failed:", storageError);
        return NextResponse.json({ error: "Không thể lưu tài khoản kênh vào cơ sở dữ liệu hoặc kho cục bộ." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ error: "Không thể tạo tài khoản kênh sau nhiều lần thử." }, { status: 409 });
}
