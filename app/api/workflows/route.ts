import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assistantTemplate, validateGraph } from "@/lib/workflow";

export const runtime = "nodejs";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true, description: true, isActive: true, createdAt: true, updatedAt: true, config: true } });
    return NextResponse.json({ workflows: workflows.map(({ config, ...workflow }) => ({ ...workflow, nodeCount: validateGraph(config)?.nodes.length ?? 0 })) });
  } catch { return NextResponse.json({ error: "Không thể tải workflow." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const template = body.template === "assistant-24-7";
    const name = typeof body.name === "string" ? body.name.trim() : template ? "Trợ lý AI trả lời khách 24/7" : "";
    if (!name || name.length > 120) return NextResponse.json({ error: "Tên workflow bắt buộc và tối đa 120 ký tự." }, { status: 400 });
    const config = template ? assistantTemplate() : validateGraph(body.config);
    if (!config) return NextResponse.json({ error: "Sơ đồ workflow không hợp lệ." }, { status: 400 });
    const workflow = await prisma.workflow.create({ data: { name, description: template ? "Mẫu trợ lý AI tự động chăm sóc khách hàng 24/7." : null, config: config as object, isActive: false } });
    return NextResponse.json({ workflow }, { status: 201 });
  } catch { return NextResponse.json({ error: "Không thể tạo workflow." }, { status: 500 }); }
}
