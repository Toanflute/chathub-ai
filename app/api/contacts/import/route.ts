import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { parseContactWriteData } from "@/lib/contact-input";

export const runtime = "nodejs";
const MAX_IMPORT_ROWS = 500;

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để nhập liên hệ." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("contacts" in body) || !Array.isArray(body.contacts)) {
    return NextResponse.json({ error: "Danh sách liên hệ không hợp lệ." }, { status: 400 });
  }
  if (body.contacts.length === 0 || body.contacts.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `Số liên hệ nhập phải từ 1 đến ${MAX_IMPORT_ROWS}.` }, { status: 400 });
  }

  const data: Prisma.ContactCreateManyInput[] = [];
  for (const [index, contact] of body.contacts.entries()) {
    const result = parseContactWriteData(contact);
    if (!result.data?.name || !result.data.initials) {
      return NextResponse.json({ error: `Dòng ${index + 1}: ${result.error ?? "Tên liên hệ là bắt buộc."}` }, { status: 400 });
    }
    data.push({ ...result.data, name: result.data.name, initials: result.data.initials });
  }

  try {
    const imported = await prisma.contact.createMany({ data });
    return NextResponse.json({ imported: imported.count }, { status: 201 });
  } catch (error) {
    console.error("Importing contacts failed:", error);
    return NextResponse.json({ error: "Không thể nhập danh sách liên hệ." }, { status: 500 });
  }
}
