"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ContactRound,
  FileText,
  Grid2X2,
  Inbox,
  ReceiptText,
  Settings,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { adminLinks, automationLinks } from "@/components/main-navigation";

const bottomLinks = [
  { label: "Liên hệ", href: "/contacts", icon: ContactRound },
  { label: "Đơn hàng", href: "/orders", icon: ReceiptText, badge: "5" },
  { label: "Tin nhắn", href: "/inbox", icon: Inbox, central: true },
  { label: "Lịch hẹn", href: "/appointments", icon: CalendarDays },
];

export default function BottomNavigation({ activePath }: { activePath: string }) {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [moreOpen]);

  return (
    <>
      <nav aria-label="Điều hướng chính" className="z-20 flex h-[70px] shrink-0 items-center justify-around border-t border-[#ECEEF3] bg-white px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(25,36,64,0.06)] md:hidden">
        {bottomLinks.map(({ label, href, icon: Icon, badge, central }) => {
          const active = activePath === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-[54px] flex-col items-center gap-1 ${central ? "-mt-7 min-w-[60px]" : ""} ${active && !central ? "text-[#2B54C3]" : "text-[#8B91A0]"}`}
            >
              {central ? (
                <span className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#2B54C3] text-white shadow-[0_5px_13px_rgba(43,84,195,0.32)]">
                  <Icon className="h-[23px] w-[23px]" />
                  <span className="absolute -right-1 -top-1 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-[#172B68] px-1 text-[9px] font-bold text-white">7</span>
                </span>
              ) : (
                <>
                  <Icon className="h-5 w-5" />
                  {badge && <span className="absolute -right-1 top-[-3px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#F04452] px-1 text-[8px] font-bold text-white">{badge}</span>}
                </>
              )}
              <span className={`text-[9px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className={`relative flex min-w-[54px] flex-col items-center gap-1 ${moreOpen ? "text-[#2B54C3]" : "text-[#8B91A0]"}`}
        >
          <Grid2X2 className="h-5 w-5" />
          <span className="absolute -right-0.5 top-[-3px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#F04452] px-1 text-[8px] font-bold text-white">3</span>
          <span className={`text-[9px] ${moreOpen ? "font-bold" : "font-medium"}`}>Khác</span>
        </button>
      </nav>

      <div
        aria-hidden={!moreOpen}
        className={`fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-200 md:hidden ${moreOpen ? "opacity-100" : "pointer-events-none invisible opacity-0"}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMoreOpen(false);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="bottom-more-title"
          className={`flex max-h-[min(84dvh,680px)] w-full max-w-[560px] flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_55px_rgba(15,23,42,0.22)] transition-transform duration-200 ${moreOpen ? "translate-y-0" : "translate-y-full"}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 id="bottom-more-title" className="text-[13px] font-extrabold tracking-[0.12em] text-slate-800">KHÁC</h2>
            <button type="button" aria-label="Đóng menu Khác" onClick={() => setMoreOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <MenuSection title="TỰ ĐỘNG HOÁ" icon={Zap} links={automationLinks} activePath={activePath} onNavigate={() => setMoreOpen(false)} />
            <MenuSection title="QUẢN TRỊ" icon={Settings} links={adminLinks} activePath={activePath} onNavigate={() => setMoreOpen(false)} />
          </div>
        </section>
      </div>
    </>
  );
}

function MenuSection({
  title,
  icon: GroupIcon,
  links,
  activePath,
  onNavigate,
}: {
  title: string;
  icon: typeof Zap;
  links: { label: string; href: string; icon: typeof Zap; badge?: string; alert?: boolean }[];
  activePath: string;
  onNavigate: () => void;
}) {
  return (
    <section>
      <h3 className="mb-2.5 flex items-center gap-2 px-1 text-[10px] font-extrabold tracking-[0.12em] text-slate-500">
        <GroupIcon className="h-3.5 w-3.5" />
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {links.map(({ label, href, icon: Icon, badge, alert }) => {
          const selected = href === activePath;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={selected ? "page" : undefined}
              className={`relative flex min-h-[58px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-[#2B54C3] bg-[#F3F5F9] text-[#2B54C3]" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${selected ? "text-[#2B54C3]" : "text-slate-500"}`} />
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">{label}</span>
              {badge && <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ${alert ? "bg-[#F04452]" : "bg-[#2B54C3]"}`}>{badge}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
