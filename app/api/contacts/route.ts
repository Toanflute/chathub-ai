import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { parseContactWriteData } from "@/lib/contact-input";
import { ensureWorkspaceSeed } from "@/lib/workspace-seed";

export const runtime = "nodejs";

function serializeContact(contact: {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  email: string | null;
  phone: string | null;
  orderNumber: string | null;
  channel: string;
  balance: { toString(): string };
  address: string;
  connected: boolean;
  tag: string;
  assignee: string;
  activity: number;
  notes: string[];
  createdAt: Date;
}) {
  return { ...contact, balance: Number(contact.balance), order: contact.orderNumber };
}

export async function GET() {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem liên hệ." }, { status: 401 });
  try {
    await ensureWorkspaceSeed();
    const records = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ contacts: records.map(serializeContact) });
  } catch (error) {
    console.error("Loading contacts failed:", error);
    return NextResponse.json({ error: "Không thể tải danh sách liên hệ." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để tạo liên hệ." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  const parsed = parseContactWriteData(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!parsed.data.name || !parsed.data.initials) return NextResponse.json({ error: "Tên liên hệ là bắt buộc." }, { status: 400 });

  try {
    const contact = await prisma.contact.create({
      data: { ...parsed.data, name: parsed.data.name, initials: parsed.data.initials },
    });
    return NextResponse.json({ contact: serializeContact(contact) }, { status: 201 });
  } catch (error) {
    console.error("Creating contact failed:", error);
    return NextResponse.json({ error: "Không thể tạo liên hệ." }, { status: 500 });
  }
}
