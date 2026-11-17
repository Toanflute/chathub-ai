import { Bot, Database, Workflow } from "lucide-react";
import ChatWidget from "@/components/chat-widget";

const features = [
  { icon: Database, title: "Thư viện kiến thức", description: "Quản lý tài liệu và nguồn dữ liệu cho trợ lý AI.", href: "/knowledge" },
  { icon: Workflow, title: "Workflow trực quan", description: "Thiết kế luồng hội thoại bằng trình kéo thả.", href: "/workflows" },
  { icon: Bot, title: "Chat hỗ trợ AI", description: "Tự động hỗ trợ khách hàng với ngữ cảnh phù hợp." },
];

export default function HomePage() {
  return <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100"><div className="mx-auto max-w-5xl"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-400">ChatHub AI</p><h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Nền tảng chăm sóc khách hàng thông minh</h1><p className="mt-5 max-w-2xl text-lg text-slate-300">Khởi tạo thư viện kiến thức, thiết kế workflow và kiểm thử trải nghiệm chat tại một nơi.</p><section className="mt-12 grid gap-5 md:grid-cols-3">{features.map(({ icon: Icon, title, description, href }) => { const content = <article className="h-full rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-600"><Icon className="h-6 w-6 text-cyan-400" aria-hidden="true"/><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p></article>; return href ? <a key={title} href={href}>{content}</a> : <div key={title}>{content}</div>; })}</section><p className="mt-10 text-sm text-slate-500">Mở bong bóng chat ở góc dưới để kiểm thử workflow đang hoạt động.</p></div><ChatWidget/></main>;
}
