import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const groups = await prisma.knowledgeGroup.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { documents: true } } } });
    return NextResponse.json({ groups });
  } catch { return NextResponse.json({ error: "Không thể tải nhóm tài liệu." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!name || name.length > 100) return NextResponse.json({ error: "Tên nhóm bắt buộc và tối đa 100 ký tự." }, { status: 400 });
    const group = await prisma.knowledgeGroup.create({ data: { name, description: description || null } });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Tên nhóm đã tồn tại." }, { status: 409 });
    return NextResponse.json({ error: "Không thể tạo nhóm tài liệu." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.id !== "string") return NextResponse.json({ error: "Thiếu ID nhóm." }, { status: 400 });
    const data: { name?: string; description?: string | null } = {};
    if (typeof body.name === "string") { const name = body.name.trim(); if (!name || name.length > 100) return NextResponse.json({ error: "Tên nhóm không hợp lệ." }, { status: 400 }); data.name = name; }
    if (typeof body.description === "string") data.description = body.description.trim() || null;
    const group = await prisma.knowledgeGroup.update({ where: { id: body.id }, data });
    return NextResponse.json({ group });
  } catch { return NextResponse.json({ error: "Không thể cập nhật nhóm; hãy kiểm tra ID và tên nhóm." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Thiếu ID nhóm." }, { status: 400 });
    await prisma.knowledgeGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "Không thể xóa nhóm; nhóm có thể không tồn tại." }, { status: 404 }); }
}
