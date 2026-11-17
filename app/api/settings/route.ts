import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function clientFor(settings: { provider: string; baseUrl: string | null; apiKey: string }) {
  const baseURL = settings.baseUrl?.trim() || (settings.provider === "deepseek" ? "https://api.deepseek.com" : undefined);
  return new OpenAI({ apiKey: settings.apiKey, ...(baseURL ? { baseURL } : {}), timeout: 15_000, maxRetries: 0 });
}

export async function GET() {
  try {
    const settings = await prisma.aiSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!settings) return NextResponse.json({ configured: false, settings: null });
    return NextResponse.json({ configured: true, settings: { provider: settings.provider, baseUrl: settings.baseUrl, modelName: settings.modelName, embeddingModel: settings.embeddingModel, isEnabled: settings.isEnabled, hasApiKey: Boolean(settings.apiKey), apiKeyPreview: settings.apiKey.length > 8 ? `${settings.apiKey.slice(0, 3)}••••••${settings.apiKey.slice(-4)}` : "••••••••" } });
  } catch { return NextResponse.json({ error: "Không thể tải cấu hình AI." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = String(body.provider ?? "");
    if (!["openai", "deepseek", "custom"].includes(provider)) return NextResponse.json({ error: "Provider không hợp lệ." }, { status: 400 });
    const previous = await prisma.aiSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    const apiKey = typeof body.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : previous?.apiKey;
    if (!apiKey) return NextResponse.json({ error: "Vui lòng nhập API key." }, { status: 400 });
    const modelName = String(body.modelName ?? "").trim();
    const embeddingModel = String(body.embeddingModel ?? "text-embedding-3-small").trim();
    const baseUrl = typeof body.baseUrl === "string" && body.baseUrl.trim() ? body.baseUrl.trim() : null;
    if (!modelName || !embeddingModel) return NextResponse.json({ error: "Model và embedding model không được để trống." }, { status: 400 });
    if (baseUrl) { try { const parsed = new URL(baseUrl); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); } catch { return NextResponse.json({ error: "Base URL không hợp lệ." }, { status: 400 }); } }
    const isEnabled = Boolean(body.isEnabled);
    if (body.testConnection) {
      const client = clientFor({ provider, baseUrl, apiKey });
      await client.models.list();
    }
    const settings = previous
      ? await prisma.aiSettings.update({ where: { id: previous.id }, data: { provider, baseUrl, apiKey, modelName, embeddingModel, isEnabled } })
      : await prisma.aiSettings.create({ data: { provider, baseUrl, apiKey, modelName, embeddingModel, isEnabled } });
    return NextResponse.json({ success: true, tested: Boolean(body.testConnection), settings: { provider: settings.provider, baseUrl: settings.baseUrl, modelName: settings.modelName, embeddingModel: settings.embeddingModel, isEnabled: settings.isEnabled, hasApiKey: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu cấu hình.";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 400 });
  }
}
