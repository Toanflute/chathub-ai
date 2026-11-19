"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Bot, CalendarDays, Check, ChevronRight, ContactRound, FileText,
  Headset, Inbox, LogOut, MessageSquareText, Moon, Package, Send, Settings,
  ShieldCheck, Sun, Users, Workflow, X, UserRound, Zap, BarChart3,
} from "lucide-react";

type MenuLink = { label: string; href: string; icon: typeof Inbox; badge?: string; badgeTone?: "blue" | "red" };

const mainLinks: MenuLink[] = [
  { label: "Tin nhắn", href: "/dashboard", icon: Inbox, badge: "7" },
  { label: "Liên hệ", href: "/dashboard?section=contacts", icon: ContactRound },
  { label: "Sản phẩm", href: "/dashboard?section=products", icon: Package },
  { label: "Đơn hàng", href: "/dashboard?section=orders", icon: FileText, badge: "5" },
  { label: "Lịch hẹn", href: "/dashboard?section=appointments", icon: CalendarDays },
];
const automationLinks: MenuLink[] = [
  { label: "Tự động hoá", href: "/knowledge", icon: Zap },
  { label: "Workflow", href: "/workflows", icon: Workflow },
  { label: "Trả lời nhanh", href: "/dashboard?section=quick-replies", icon: MessageSquareText },
  { label: "Chiến dịch", href: "/dashboard?section=campaigns", icon: Send },
];
const adminLinks: MenuLink[] = [
  { label: "Kênh", href: "/dashboard?section=channels", icon: Bot, badge: "3", badgeTone: "red" },
  { label: "Đội ngũ", href: "/dashboard?section=team", icon: Users },
  { label: "Báo cáo", href: "/dashboard?section=reports", icon: BarChart3 },
  { label: "Nhật ký hoạt động", href: "/dashboard?section=activity", icon: Activity },
  { label: "Cài đặt", href: "/dashboard?section=settings", icon: Settings },
];

export default function NavigationSidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [available, setAvailable] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const openMenu = () => setOpen(true);
    window.addEventListener("chathub:open-navigation", openMenu);
    return () => window.removeEventListener("chathub:open-navigation", openMenu);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function MenuContent({ mobile = false }: { mobile?: boolean }) {
    const linkClass = (active = false) => `flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition ${active ? "border border-blue-200 bg-blue-50 font-semibold text-[#2B54C3]" : "border border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`;
    const group = (title: string, links: MenuLink[], glyph: "zap" | "settings") => <section className="mt-5">
      <h2 className="mb-2 flex items-center gap-1.5 px-2 text-[10px] font-bold tracking-[0.12em] text-slate-400">{glyph === "zap" ? <Zap className="h-3 w-3"/> : <Settings className="h-3 w-3"/>}{title}</h2>
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">{links.map(({ label, href, icon: Icon, badge, badgeTone }) => <button key={label} onClick={() => navigate(href)} className={linkClass(label === "Tin nhắn")}><Icon className={`h-[18px] w-[18px] shrink-0 ${label === "Tin nhắn" ? "text-[#2B54C3]" : "text-slate-400"}`}/><span className="min-w-0 flex-1 truncate text-left">{label}</span>{badge && <span className={`flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${badgeTone === "red" ? "bg-red-500" : "bg-blue-600"}`}>{badge}</span>}</button>)}</div>
    </section>;

    return <div className={`flex h-full flex-col overflow-y-auto bg-white px-4 pb-5 pt-4 ${mobile ? "" : ""}`}>
      <div className="flex items-center gap-3 rounded-xl px-1 pb-4">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">AD<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"/></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">Admin</p><p className="mt-0.5 text-xs text-slate-500">Chủ sở hữu</p></div>
        <button aria-label="Hồ sơ người dùng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><UserRound className="h-[18px] w-[18px]"/></button>
      </div>
      <div className="grid grid-cols-2 gap-2 border-y border-slate-100 py-3">
        <button onClick={() => setDark(!dark)} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">{dark ? <Moon className="h-4 w-4 text-indigo-500"/> : <Sun className="h-4 w-4 text-amber-500"/>}{dark ? "Tối" : "Sáng"}</button>
        <button onClick={() => setAvailable(!available)} className="flex h-10 items-center justify-between gap-1 rounded-xl border border-slate-200 px-2 text-[10px] font-medium text-slate-600" aria-pressed={available}><span className="leading-tight">Đang nhận hội thoại mới</span><span className={`relative h-5 w-9 shrink-0 rounded-full transition ${available ? "bg-emerald-500" : "bg-slate-300"}`}><i className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${available ? "left-[18px]" : "left-0.5"}`}/></span></button>
        <button onClick={() => navigate("/dashboard?section=security")} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><ShieldCheck className="h-4 w-4 text-slate-400"/>Bảo mật</button>
        <button onClick={logout} disabled={loggingOut} className="flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"><LogOut className="h-4 w-4"/>{loggingOut ? "Đang thoát…" : "Đăng xuất"}</button>
      </div>
      <nav className="pb-3" aria-label="Menu chính">
        <div className="mt-4 grid grid-cols-2 gap-1 lg:grid-cols-1">{mainLinks.map(({ label, href, icon: Icon, badge }) => <button key={label} onClick={() => navigate(href)} className={linkClass(label === "Tin nhắn")}><Icon className={`h-[18px] w-[18px] shrink-0 ${label === "Tin nhắn" ? "text-[#2B54C3]" : "text-slate-400"}`}/><span className="min-w-0 flex-1 truncate text-left">{label}</span>{badge && <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{badge}</span>}</button>)}</div>
        {group("TỰ ĐỘNG HOÁ", automationLinks, "zap")}
        {group("QUẢN TRỊ", adminLinks, "settings")}
      </nav>
    </div>;
  }

  return <>
    <aside className="fixed bottom-0 left-0 top-14 z-20 hidden w-[260px] border-r border-slate-200 bg-white lg:block"><MenuContent/></aside>
    {open && <div className="fixed inset-0 z-[60] lg:hidden"><button className="absolute inset-0 bg-slate-950/45" onClick={() => setOpen(false)} aria-label="Đóng menu"/><aside className="absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] animate-in slide-in-from-top overflow-hidden rounded-b-2xl bg-white shadow-2xl duration-200"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><p className="text-sm font-bold text-slate-800">Menu điều hướng</p><button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Đóng menu"><X className="h-5 w-5"/></button></div><div className="max-h-[calc(100dvh-7rem)] overflow-y-auto"><MenuContent mobile/></div></aside></div>}
  </>;
}
