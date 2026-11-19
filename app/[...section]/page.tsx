import { notFound } from "next/navigation";

const sectionTitles: Record<string, string> = {
  contacts: "Liên hệ",
  products: "Sản phẩm",
  orders: "Đơn hàng",
  appointments: "Lịch hẹn",
  "quick-replies": "Trả lời nhanh",
  campaigns: "Chiến dịch",
  channels: "Kênh",
  team: "Đội ngũ",
  reports: "Báo cáo",
  activity: "Nhật ký hoạt động",
  settings: "Cài đặt",
  "settings/security": "Bảo mật",
};

export default function SectionPage({ params }: { params: { section: string[] } }) {
  const section = params.section.join("/");
  const title = sectionTitles[section];

  if (!title) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F6FA] px-5 text-[#202638]">
      <section className="w-full max-w-md rounded-2xl border border-[#E8EAF0] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2B54C3]">ChatHub AI</p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Trang {title.toLocaleLowerCase("vi")} đang được phát triển.
        </p>
        <a
          href="/inbox"
          className="mt-6 inline-flex rounded-xl bg-[#2B54C3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2448A8]"
        >
          Quay lại tin nhắn
        </a>
      </section>
    </main>
  );
}
