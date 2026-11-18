"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Bot, MessageSquareText, Send, Settings, Users, Workflow, X, Zap,
} from "lucide-react";

const automationItems = [
  { label: "Tự động hoá", href: "/knowledge", icon: Zap },
  { label: "Workflow", href: "/workflows", icon: Workflow },
  { label: "Trả lời nhanh", href: "/dashboard?section=quick-replies", icon: MessageSquareText },
  { label: "Chiến dịch", href: "/dashboard?section=campaigns", icon: Send },
];

const adminItems = [
  { label: "Kênh", href: "/dashboard?section=channels", icon: Bot, badge: "3" },
  { label: "Đội ngũ", href: "/dashboard?section=team", icon: Users },
  { label: "Báo cáo", href: "/dashboard?section=reports", icon: Activity },
  { label: "Nhật ký hoạt động", href: "/dashboard?section=activity", icon: MessageSquareText },
  { label: "Cài đặt", href: "/dashboard?section=settings", icon: Settings },
];

export default function MoreMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button || !button.textContent?.trim().startsWith("Khác")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(true);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="more-menu-title" className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:rounded-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 id="more-menu-title" className="text-xs font-extrabold tracking-[0.14em] text-slate-900">KHÁC</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Đóng menu Khác" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
      </header>
      <div className="max-h-[min(70dvh,560px)] overflow-y-auto px-5 pb-6 pt-2">
        <section className="mt-3">
          <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-[10px] font-bold tracking-[0.12em] text-slate-400"><Zap className="h-3.5 w-3.5 text-amber-500" />TỰ ĐỘNG HOÁ</h3>
          <div className="grid grid-cols-2 gap-2">
            {automationItems.map(({ label, href, icon: Icon }) => <button key={label} type="button" onClick={() => navigate(href)} className="flex min-h-[76px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Icon className="h-[18px] w-[18px]" /></span><span className="text-xs font-semibold text-slate-700">{label}</span></button>)}
          </div>
        </section>
        <section className="mt-5">
          <h3 className="mb-2.5 flex items-center gap-1.5 px-1 text-[10px] font-bold tracking-[0.12em] text-slate-400"><Settings className="h-3.5 w-3.5 text-slate-500" />QUẢN TRỊ</h3>
          <div className="grid grid-cols-2 gap-2">
            {adminItems.map(({ label, href, icon: Icon, badge }) => <button key={label} type="button" onClick={() => navigate(href)} aria-current={label === "Kênh" ? "page" : undefined} className={`relative flex min-h-[76px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${label === "Kênh" ? "border-blue-200 bg-slate-50 text-[#2B54C3] shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/50"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${label === "Kênh" ? "bg-white text-[#2B54C3]" : "bg-slate-50 text-slate-500"}`}><Icon className="h-[18px] w-[18px]" /></span><span className="min-w-0 flex-1 text-xs font-semibold">{label}</span>{badge && <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{badge}</span>}</button>)}
          </div>
        </section>
      </div>
    </section>
  </div>;
}
