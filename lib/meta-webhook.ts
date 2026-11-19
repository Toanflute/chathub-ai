import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSystemSecret } from "@/lib/system-settings";

export async function verifyMetaWebhook(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const providedToken = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ error: "Yêu cầu xác minh webhook không hợp lệ." }, { status: 400 });
  }
  try {
    const expectedToken = await getSystemSecret("channels", "facebookVerifyToken");
    if (!expectedToken) return NextResponse.json({ error: "Verify Token chưa được cấu hình." }, { status: 503 });
    const expected = Buffer.from(expectedToken);
    const received = Buffer.from(providedToken);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      return NextResponse.json({ error: "Verify Token không hợp lệ." }, { status: 403 });
    }
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch {
    return NextResponse.json({ error: "Không thể xác minh webhook. Kiểm tra cấu hình mã hoá khoá bí mật." }, { status: 503 });
  }
}
