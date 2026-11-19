"use client";

import Link from "next/link";
import { useSettings } from "@/context/SettingsContext";

export default function PrivacyPage() {
  const { settings } = useSettings();
  const systemName = String(settings.general?.systemName ?? "ChatHub");
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold text-blue-700">{systemName}</p>
        <h1 className="mt-2 text-2xl font-bold">Chính sách quyền riêng tư</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{systemName} xử lý thông tin tài khoản và nội dung hội thoại để cung cấp dịch vụ chăm sóc khách hàng. Quyền truy cập dữ liệu nền tảng chỉ được sử dụng khi quản trị viên cấp quyền kết nối.</p>
        <h2 className="mt-6 font-semibold">Bảo vệ dữ liệu</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Khoá ứng dụng và thông tin xác thực được mã hoá khi lưu. Người dùng có thể yêu cầu quản trị viên ngắt kết nối kênh hoặc xoá dữ liệu liên quan theo chính sách lưu trữ của tổ chức.</p>
        <h2 className="mt-6 font-semibold">Liên hệ</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Liên hệ quản trị viên hệ thống {systemName} để được hỗ trợ về dữ liệu cá nhân hoặc quyền truy cập.</p>
        <Link href="/settings" className="mt-8 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Quay lại Cài đặt</Link>
      </article>
    </main>
  );
}
