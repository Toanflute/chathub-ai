import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { assertChannelCredentialEncryptionConfigured, encryptChannelCredentials } from "@/lib/channel-credentials";
import { oauthStateCookie, type OAuthState } from "@/lib/channel-oauth-state";
import { getSystemSecret, getSystemSettingValue } from "@/lib/system-settings";

export const runtime = "nodejs";
type Params = { params: { id: string } };

function applicationBaseUrl(requestUrl: string) {
  const configured = process.env.CHANNELS_BASE_URL;
  const value = configured ?? (process.env.NODE_ENV === "production" ? "" : new URL(requestUrl).origin);
  if (!value) throw new Error("CHANNELS_BASE_URL chưa được cấu hình.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("CHANNELS_BASE_URL không hợp lệ.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("CHANNELS_BASE_URL phải sử dụng HTTPS trong môi trường production.");
  }
  return url.origin;
}

function redirectToChannels(requestUrl: string, message: string) {
  try {
    const baseUrl = applicationBaseUrl(requestUrl);
    return NextResponse.redirect(new URL(`/channels?connect=${encodeURIComponent(message)}`, baseUrl));
  } catch {
    return NextResponse.json({ error: "Cấu hình URL ứng dụng trước khi kết nối kênh." }, { status: 503 });
  }
}

function stateCookie(response: NextResponse, state: OAuthState) {
  response.cookies.set(oauthStateCookie, Buffer.from(JSON.stringify(state)).toString("base64url"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/channels",
    maxAge: 600,
  });
  return response;
}

export async function GET(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để kết nối kênh." }, { status: 401 });
  const channel = await prisma.channelConnection.findUnique({ where: { id: params.id } });
  if (!channel) return redirectToChannels(request.url, "not-found");

  try {
    const baseUrl = applicationBaseUrl(request.url);
    const metaChannel = channel.platform === "facebook" || channel.platform === "instagram";
    const redirectUri = `${baseUrl}${metaChannel ? "/api/channels/facebook/oauth/callback" : "/api/channels/oauth/callback"}`;
    const state: OAuthState = {
      state: randomBytes(32).toString("base64url"),
      channelId: channel.id,
      provider: "meta",
    };
    let authorizationUrl: URL;

    if (channel.platform === "facebook" || channel.platform === "instagram") {
      const storedAppId = await getSystemSettingValue("channels", "facebookAppId");
      const appId = process.env.META_APP_ID || (typeof storedAppId === "string" ? storedAppId : "");
      const appSecret = process.env.META_APP_SECRET || await getSystemSecret("channels", "facebookAppSecret");
      if (!appId || !appSecret) return redirectToChannels(request.url, "meta-setup");
      try {
        assertChannelCredentialEncryptionConfigured();
      } catch {
        return redirectToChannels(request.url, "encryption-setup");
      }
      const graphVersion = process.env.META_GRAPH_VERSION || "v27.0";
      authorizationUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
      authorizationUrl.search = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: "code",
        state: state.state,
        scope: channel.platform === "instagram"
          ? "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_messages"
          : "pages_show_list,pages_read_engagement,pages_messaging,pages_manage_metadata",
      }).toString();
    } else if (channel.platform === "zalo_oa") {
      const appId = process.env.ZALO_OA_APP_ID;
      if (!appId || !process.env.ZALO_OA_APP_SECRET) return redirectToChannels(request.url, "zalo-setup");
      try {
        assertChannelCredentialEncryptionConfigured();
      } catch {
        return redirectToChannels(request.url, "encryption-setup");
      }
      state.provider = "zalo";
      state.verifier = randomBytes(32).toString("base64url");
      const challenge = createHash("sha256").update(state.verifier).digest("base64url");
      authorizationUrl = new URL("https://oauth.zaloapp.com/v4/oa/permission");
      authorizationUrl.search = new URLSearchParams({
        app_id: appId,
        redirect_uri: redirectUri,
        state: state.state,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();
    } else if (channel.platform === "discord") {
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (!clientId || !process.env.DISCORD_BOT_TOKEN) return redirectToChannels(request.url, "discord-setup");
      state.provider = "discord";
      authorizationUrl = new URL("https://discord.com/oauth2/authorize");
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        scope: "bot applications.commands",
        permissions: "68608",
        integration_type: "0",
        redirect_uri: redirectUri,
        response_type: "code",
        prompt: "consent",
        state: state.state,
      }).toString();
    } else {
      const reason = channel.platform === "telegram_bot" ? "telegram-token" : channel.platform === "chat_plugin" ? "website-setup" : "unsupported";
      return redirectToChannels(request.url, `${reason}:${channel.id}`);
    }

    return stateCookie(NextResponse.redirect(authorizationUrl), state);
  } catch (error) {
    console.error("Starting channel authorization failed:", error);
    return redirectToChannels(request.url, "configuration-error");
  }
}

export async function POST(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để kết nối kênh." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("token" in body) || typeof body.token !== "string") {
    return NextResponse.json({ error: "Bot token không hợp lệ." }, { status: 400 });
  }
  const token = body.token.trim();
  if (token.length < 20 || token.length > 200) return NextResponse.json({ error: "Bot token không hợp lệ." }, { status: 400 });

  const channel = await prisma.channelConnection.findUnique({ where: { id: params.id } });
  if (!channel) return NextResponse.json({ error: "Không tìm thấy tài khoản kênh." }, { status: 404 });
  if (channel.platform !== "telegram_bot") return NextResponse.json({ error: "Loại kênh này không sử dụng bot token Telegram." }, { status: 400 });

  try {
    assertChannelCredentialEncryptionConfigured();
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !("ok" in result) || result.ok !== true
      || !("result" in result) || !result.result || typeof result.result !== "object") {
      return NextResponse.json({ error: "Telegram không xác nhận token. Hãy kiểm tra token từ BotFather." }, { status: 400 });
    }
    const bot = result.result as { id?: number; username?: string };
    if (typeof bot.id !== "number") throw new Error("Telegram trả về thông tin bot không hợp lệ.");
    await prisma.channelConnection.update({
      where: { id: channel.id },
      data: {
        status: "connected",
        credentialsEncrypted: encryptChannelCredentials({ accessToken: token }),
        externalAccountId: String(bot.id),
        connectedAt: new Date(),
        lastError: null,
      },
    });
    return NextResponse.json({ connected: true, username: bot.username ?? null });
  } catch (error) {
    console.error("Validating Telegram bot token failed.");
    const message = error instanceof Error && error.message.includes("CHANNEL_CREDENTIALS_KEY")
      ? "Cấu hình CHANNEL_CREDENTIALS_KEY trước khi lưu token."
      : "Không thể kết nối Telegram Bot. Hãy thử lại.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
