import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateGraph } from "@/lib/workflow";

export const runtime = "nodejs";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: params.id } });
    if (!workflow) return NextResponse.json({ error: "Không tìm thấy workflow." }, { status: 404 });
    return NextResponse.json({ workflow: { ...workflow, config: validateGraph(workflow.config) ?? { nodes: [], edges: [] } } });
  } catch { return NextResponse.json({ error: "Không thể tải workflow." }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const data: { name?: string; description?: string | null; isActive?: boolean; config?: object } = {};
    if (typeof body.name === "string") { const name = body.name.trim(); if (!name || name.length > 120) return NextResponse.json({ error: "Tên workflow không hợp lệ." }, { status: 400 }); data.name = name; }
    if (typeof body.description === "string") data.description = body.description.trim() || null;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;
    if (body.config !== undefined) { const config = validateGraph(body.config); if (!config) return NextResponse.json({ error: "Sơ đồ không hợp lệ (tối đa 60 node và 120 cạnh)." }, { status: 400 }); data.config = config as object; }
    const workflow = await prisma.workflow.update({ where: { id: params.id }, data });
    return NextResponse.json({ workflow });
  } catch { return NextResponse.json({ error: "Không thể cập nhật workflow." }, { status: 400 }); }
}

export async function DELETE(_request: Request, { params }: Params) {
  try { await prisma.workflow.delete({ where: { id: params.id } }); return NextResponse.json({ success: true }); }
  catch { return NextResponse.json({ error: "Không tìm thấy workflow để xóa." }, { status: 404 }); }
}
