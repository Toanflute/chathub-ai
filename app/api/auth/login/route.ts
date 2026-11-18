import { NextResponse } from "next/server";

const DEMO_EMAIL = "gavanghd@gmail.com";
const DEMO_PASSWORD = "123456";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.email !== DEMO_EMAIL || body.password !== DEMO_PASSWORD) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không chính xác." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("chathub_demo_session", "authenticated", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Yêu cầu đăng nhập không hợp lệ." }, { status: 400 });
  }
}
