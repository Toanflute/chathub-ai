import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { encryptChannelCredentials } from "@/lib/channel-credentials";
import { oauthStateCookie, type OAuthState } from "@/lib/channel-oauth-state";
import { getSystemSecret, getSystemSettingValue } from "@/lib/system-settings";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function applicationBaseUrl(requestUrl: string) {
  const configured = process.env.CHANNELS_BASE_URL;
  const value = configured ?? (process.env.NODE_ENV === "production" ? "" : new URL(requestUrl).origin);
  if (!value) throw new Error("CHANNELS_BASE_URL chưa được cấu hình.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("CHANNELS_BASE_URL không hợp lệ.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("CHANNELS_BASE_URL phải sử dụng HTTPS trong production.");
  }
  return url.origin;
}

function redirectToChannels(requestUrl: string, message: string) {
  try {
    return NextResponse.redirect(new URL(`/channels?connect=${encodeURIComponent(message)}`, applicationBaseUrl(requestUrl)));
  } catch {
    return NextResponse.json({ error: "Cấu hình URL ứng dụng trước khi kết nối kênh." }, { status: 503 });
  }
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(oauthStateCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/channels",
    maxAge: 0,
  });
  return response;
}

function sameState(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function providerJson(url: string, init?: RequestInit): Promise<JsonRecord> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const data: unknown = await response.json();
  if (!isRecord(data) || !response.ok || data.error) throw new Error("Nhà cung cấp không chấp nhận yêu cầu xác thực.");
  return data;
}

function oauthStateFromCookie(): OAuthState | null {
  const value = cookies().get(oauthStateCookie)?.value;
  if (!value) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!isRecord(data)
      || typeof data.state !== "string"
      || typeof data.channelId !== "string"
      || !["meta", "zalo", "discord"].includes(String(data.provider))) return null;
    return data as OAuthState;
  } catch {
    return null;
  }
}

async function connectMeta(channel: { id: string; platform: string; name: string }, code: string, redirectUri: string) {
  const storedAppId = await getSystemSettingValue("channels", "facebookAppId");
  const appId = process.env.META_APP_ID || (typeof storedAppId === "string" ? storedAppId : "");
  const appSecret = process.env.META_APP_SECRET || await getSystemSecret("channels", "facebookAppSecret");
  if (!appId || !appSecret) throw new Error("Thiếu cấu hình ứng dụng Meta.");
  const graphVersion = process.env.META_GRAPH_VERSION || "v27.0";
  const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  }).toString();
  const shortLivedToken = await providerJson(tokenUrl.toString());
  if (typeof shortLivedToken.access_token !== "string") throw new Error("Meta không trả về access token.");

  const longTokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  longTokenUrl.search = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken.access_token,
  }).toString();
  const longLivedToken = await providerJson(longTokenUrl.toString());
  const userToken = typeof longLivedToken.access_token === "string" ? longLivedToken.access_token : shortLivedToken.access_token;
  const pagesUrl = new URL(`https://graph.facebook.com/${graphVersion}/me/accounts`);
  pagesUrl.search = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userToken,
  }).toString();
  const pageResponse = await providerJson(pagesUrl.toString());
  const pages = Array.isArray(pageResponse.data) ? pageResponse.data.filter(isRecord) : [];
  const eligiblePages = pages.filter((page) =>
    channel.platform !== "instagram" || isRecord(page.instagram_business_account),
  );
  const normalizedName = channel.name.trim().toLocaleLowerCase("vi");
  const matchingPage = eligiblePages.find((page) =>
    typeof page.name === "string" && page.name.trim().toLocaleLowerCase("vi") === normalizedName,
  );
  const page = matchingPage ?? (eligiblePages.length === 1 ? eligiblePages[0] : undefined);
  if (!page || typeof page.id !== "string" || typeof page.access_token !== "string") {
    throw new Error(eligiblePages.length > 1
      ? "Tài khoản có nhiều trang. Hãy đặt tên kênh trùng tên trang cần kết nối rồi thử lại."
      : channel.platform === "instagram"
        ? "Không tìm thấy Trang Facebook có liên kết Instagram chuyên nghiệp."
        : "Tài khoản Meta không có Trang Facebook được cấp quyền.");
  }
  const instagramAccount = isRecord(page.instagram_business_account) ? page.instagram_business_account : null;
  const accountId = channel.platform === "instagram" && typeof instagramAccount?.id === "string"
    ? instagramAccount.id
    : page.id;
  const accountName = channel.platform === "instagram" && typeof instagramAccount?.username === "string"
    ? `@${instagramAccount.username}`
    : typeof page.name === "string" ? page.name : channel.name;
  await prisma.channelConnection.update({
    where: { id: channel.id },
    data: {
      status: "connected",
      credentialsEncrypted: encryptChannelCredentials({ accessToken: page.access_token }),
      externalAccountId: accountId,
      connectedAt: new Date(),
      lastError: null,
      name: accountName,
    },
  });
}

async function connectZalo(channelId: string, code: string, verifier: string) {
  const appId = process.env.ZALO_OA_APP_ID;
  const appSecret = process.env.ZALO_OA_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Thiếu cấu hình ứng dụng Zalo OA.");
  const body = new URLSearchParams({
    app_id: appId,
    code,
    grant_type: "authorization_code",
    code_verifier: verifier,
  });
  const tokenResponse = await providerJson("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: appSecret,
    },
    body,
  });
  if (typeof tokenResponse.access_token !== "string") throw new Error("Zalo OA không trả về access token.");
  const credentials: Record<string, unknown> = {
    accessToken: tokenResponse.access_token,
    ...(typeof tokenResponse.refresh_token === "string" ? { refreshToken: tokenResponse.refresh_token } : {}),
    ...(typeof tokenResponse.expires_in === "string" || typeof tokenResponse.expires_in === "number"
      ? { expiresIn: String(tokenResponse.expires_in) }
      : {}),
  };
  await prisma.channelConnection.update({
    where: { id: channelId },
    data: {
      status: "connected",
      credentialsEncrypted: encryptChannelCredentials(credentials),
      connectedAt: new Date(),
      lastError: null,
    },
  });
}

async function connectDiscord(channelId: string, guildId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    await prisma.channelConnection.update({
      where: { id: channelId },
      data: { status: "needs_config", externalAccountId: guildId, lastError: "Cấu hình DISCORD_BOT_TOKEN để hoàn tất kết nối bot." },
    });
    throw new Error("Bot đã được mời vào máy chủ. Cấu hình token bot Discord rồi bấm Kiểm tra.");
  }
  const response = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}`, {
    headers: { Authorization: `Bot ${botToken}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Discord không xác nhận bot trong máy chủ đã chọn.");
  const guild: unknown = await response.json();
  if (!isRecord(guild) || typeof guild.id !== "string") throw new Error("Discord trả về thông tin máy chủ không hợp lệ.");
  await prisma.channelConnection.update({
    where: { id: channelId },
    data: { status: "connected", externalAccountId: guild.id, connectedAt: new Date(), lastError: null },
  });
}

export async function GET(request: Request) {
  if (!isAuthenticatedRequest()) {
    return clearStateCookie(NextResponse.json({ error: "Phiên đăng nhập ChatHub đã hết hạn." }, { status: 401 }));
  }
  const url = new URL(request.url);
  const cookieState = oauthStateFromCookie();
  const receivedState = url.searchParams.get("state") ?? "";
  if (!cookieState || !sameState(cookieState.state, receivedState)) {
    return clearStateCookie(redirectToChannels(request.url, "state-invalid"));
  }

  const responseError = url.searchParams.get("error");
  if (responseError) {
    await prisma.channelConnection.updateMany({
      where: { id: cookieState.channelId },
      data: { lastError: "Người dùng đã huỷ hoặc từ chối quyền truy cập.", status: "error" },
    });
    return clearStateCookie(redirectToChannels(request.url, "cancelled"));
  }

  const code = url.searchParams.get("code");
  const channel = await prisma.channelConnection.findUnique({ where: { id: cookieState.channelId } });
  if (!channel || channel.platform === "telegram_bot" || channel.platform === "chat_plugin") {
    return clearStateCookie(redirectToChannels(request.url, "not-found"));
  }
  let redirectUri = "";
  try {
    const callbackPath = cookieState.provider === "meta" ? "/api/channels/facebook/oauth/callback" : "/api/channels/oauth/callback";
    redirectUri = `${applicationBaseUrl(request.url)}${callbackPath}`;
  } catch {
    return clearStateCookie(redirectToChannels(request.url, "base-url-setup"));
  }

  try {
    if (cookieState.provider === "discord") {
      const guildId = url.searchParams.get("guild_id");
      if (!guildId || !/^\d{15,22}$/.test(guildId)) throw new Error("Không nhận được máy chủ Discord được chọn.");
      await connectDiscord(channel.id, guildId);
    } else {
      if (!code) throw new Error("Nhà cung cấp không trả về mã xác thực.");
      if (!redirectUri) throw new Error("CHANNELS_BASE_URL chưa được cấu hình.");
      if (cookieState.provider === "meta") await connectMeta(channel, code, redirectUri);
      else if (cookieState.provider === "zalo" && cookieState.verifier) {
        await connectZalo(channel.id, code, cookieState.verifier);
      } else {
        throw new Error("Luồng xác thực không hợp lệ.");
      }
    }
    return clearStateCookie(redirectToChannels(request.url, "success"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể hoàn tất xác thực.";
    console.error("Completing channel authorization failed:", message);
    await prisma.channelConnection.updateMany({
      where: { id: channel.id },
      data: { status: "error", lastError: message.slice(0, 500) },
    });
    return clearStateCookie(redirectToChannels(request.url, "failed"));
  }
}
