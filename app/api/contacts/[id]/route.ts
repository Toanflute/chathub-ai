import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { parseContactWriteData } from "@/lib/contact-input";
import { isPrismaNotFoundError } from "@/lib/prisma-errors";

export const runtime = "nodejs";

type Params = { params: { id: string } };

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

export async function PATCH(request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật liên hệ." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  const parsed = parseContactWriteData(body, { partial: true });
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const contact = await prisma.contact.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ contact: serializeContact(contact) });
  } catch (error) {
    console.error("Updating contact failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy liên hệ." : "Không thể cập nhật liên hệ." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xoá liên hệ." }, { status: 401 });
  try {
    await prisma.contact.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Deleting contact failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy liên hệ để xoá." : "Không thể xoá liên hệ." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}
