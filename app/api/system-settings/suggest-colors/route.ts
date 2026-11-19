import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { getAiRuntimeSettings } from "@/lib/ai-settings";

export const runtime = "nodejs";
export const maxDuration = 30;

const colorKeys = ["accent", "brand", "page", "card", "text", "success", "warning", "danger", "info"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để phối màu." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.description !== "string" || body.description.trim().length < 3 || body.description.length > 500) {
    return NextResponse.json({ error: "Mô tả bảng màu cần có từ 3 đến 500 ký tự." }, { status: 400 });
  }
  try {
    const stored = await getAiRuntimeSettings();
    if (!stored.isEnabled || !stored.apiKey) return NextResponse.json({ error: "Hãy bật AI và cấu hình API key trong trang Cài đặt." }, { status: 400 });
    const apiKey = stored.apiKey;
    const baseURL = stored.baseUrl?.trim() || (stored.provider === "deepseek" ? "https://api.deepseek.com" : undefined);
    const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), timeout: 20_000, maxRetries: 0 });
    const result = await client.chat.completions.create({
      model: stored.modelName,
      temperature: 0.6,
      response_format: { type: "json_object" },
      max_tokens: 300,
      messages: [
        { role: "system", content: `Tạo bảng màu giao diện có độ tương phản tốt từ mô tả của người dùng. Chỉ trả JSON object với các khoá chính xác: ${colorKeys.join(", ")}. Mỗi giá trị phải là mã hex 6 chữ số có dấu #. Màu page/card/text phải dễ đọc; accent/brand là màu thương hiệu; success/warning/danger/info là màu trạng thái.` },
        { role: "user", content: body.description.trim() },
      ],
    });
    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error("AI không trả về bảng màu.");
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed) || colorKeys.some((key) => typeof parsed[key] !== "string" || !/^#[\da-f]{6}$/i.test(parsed[key] as string))) {
      throw new Error("AI trả về bảng màu không hợp lệ.");
    }
    return NextResponse.json({ colors: Object.fromEntries(colorKeys.map((key) => [key, parsed[key]])) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể phối màu.";
    const status = message.includes("CHANNEL_CREDENTIALS_KEY") ? 503 : 400;
    return NextResponse.json({ error: status === 503 ? "Cần cấu hình CHANNEL_CREDENTIALS_KEY để đọc khoá AI đã mã hoá." : message.slice(0, 250) }, { status });
  }
}
