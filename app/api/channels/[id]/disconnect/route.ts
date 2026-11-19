import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { isPrismaNotFoundError } from "@/lib/prisma-errors";

export const runtime = "nodejs";
type Params = { params: { id: string } };

export async function POST(_request: Request, { params }: Params) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để ngắt kết nối kênh." }, { status: 401 });
  try {
    const channel = await prisma.channelConnection.update({
      where: { id: params.id },
      data: {
        status: "disconnected",
        enabled: false,
        credentialsEncrypted: null,
        externalAccountId: null,
        connectedAt: null,
        lastError: null,
      },
      select: { id: true, status: true },
    });
    return NextResponse.json({ channel: { id: channel.id, status: channel.status } });
  } catch (error) {
    console.error("Disconnecting channel failed:", error);
    return NextResponse.json(
      { error: isPrismaNotFoundError(error) ? "Không tìm thấy tài khoản kênh." : "Không thể ngắt kết nối tài khoản kênh." },
      { status: isPrismaNotFoundError(error) ? 404 : 500 },
    );
  }
}
