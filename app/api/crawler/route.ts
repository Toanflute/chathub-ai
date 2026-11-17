import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.url !== "string" || body.url.length > 2048) return NextResponse.json({ error: "Vui lòng nhập URL hợp lệ." }, { status: 400 });
    const scope = body.scope === "domain" ? "domain" : body.scope === "single" ? "single" : null;
    if (!scope) return NextResponse.json({ error: "Phạm vi quét không hợp lệ." }, { status: 400 });
    const preview = await crawlWebsite(body.url, scope);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Quét website thất bại." }, { status: 400 });
  }
}
