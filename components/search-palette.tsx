"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, CalendarDays, ContactRound, FileText, Inbox, MessageSquare,
  Package, Search, Workflow,
} from "lucide-react";

type Result = {
  title: string;
  subtitle: string;
  group: string;
  category: string;
  href: string;
  icon: typeof Inbox;
  keywords?: string;
};

const results: Result[] = [
  { title: "Tin nhắn", subtitle: "Mở hộp thư hội thoại", group: "Trang", category: "Trang", href: "/dashboard", icon: Inbox, keywords: "inbox hội thoại chat" },
  { title: "Liên hệ", subtitle: "Quản lý danh sách khách hàng", group: "Trang", category: "Trang", href: "/dashboard?section=contacts", icon: ContactRound, keywords: "khách hàng" },
  { title: "Sản phẩm", subtitle: "Danh mục sản phẩm", group: "Trang", category: "Trang", href: "/dashboard?section=products", icon: Package },
  { title: "Đơn hàng", subtitle: "Theo dõi đơn hàng", group: "Trang", category: "Trang", href: "/dashboard?section=orders", icon: FileText },
  { title: "Lịch hẹn", subtitle: "Lịch và cuộc hẹn", group: "Trang", category: "Trang", href: "/dashboard?section=appointments", icon: CalendarDays },
  { title: "Tự động hoá", subtitle: "Thư viện kiến thức và cài đặt AI", group: "Trang", category: "Trang", href: "/knowledge", icon: Bot, keywords: "knowledge ai" },
  { title: "Workflow", subtitle: "Thiết kế luồng hội thoại", group: "Trang", category: "Trang", href: "/workflows", icon: Workflow },
  { title: "Trả lời nhanh", subtitle: "Các câu trả lời đã lưu", group: "Trang", category: "Trang", href: "/dashboard?section=quick-replies", icon: MessageSquare },
  { title: "Bùi Gia Huy", subtitle: "Shop ơi, đơn hàng của mình khi nào giao tới vậy ạ?", group: "Hội thoại", category: "Hội thoại", href: "/dashboard?conversation=1", icon: Inbox, keywords: "tin nhắn messenger" },
  { title: "Hoàng Bảo Ngọc", subtitle: "Hỏi về chính sách đổi trả sản phẩm", group: "Hội thoại", category: "Hội thoại", href: "/dashboard?conversation=2", icon: Inbox, keywords: "tin nhắn web chat" },
  { title: "Phạm Hoàng Long", subtitle: "Cảm ơn shop, mình đã nhận được hàng rồi nhé!", group: "Tin nhắn", category: "Tin nhắn", href: "/dashboard?conversation=3", icon: MessageSquare },
  { title: "Nguyễn Thu Hà", subtitle: "Sản phẩm bị lỗi, cần hỗ trợ đổi hàng", group: "Liên hệ", category: "Liên hệ", href: "/dashboard?conversation=4", icon: ContactRound, keywords: "khiếu nại" },
  { title: "Đơn hàng #CH-240910", subtitle: "Bùi Gia Huy · Đang giao", group: "Đơn hàng", category: "Đơn hàng", href: "/dashboard?section=orders", icon: FileText },
];

const tabs = ["Tất cả", "Trang", "Hội thoại", "Liên hệ", "Tin nhắn", "Sản phẩm", "Đơn hàng"];

export default function SearchPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Tất cả");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => results.filter((result) => {
    const matchesTab = tab === "Tất cả" || result.category === tab || result.group === tab;
    const searchable = `${result.title} ${result.subtitle} ${result.group} ${result.keywords ?? ""}`.toLocaleLowerCase("vi");
    return matchesTab && (!query.trim() || searchable.includes(query.trim().toLocaleLowerCase("vi")));
  }), [query, tab]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);
  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('button[aria-label="Tìm kiếm"]')) {
        event.preventDefault();
        event.stopPropagation();
        openPalette();
      }
    };
    const handleKeys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Tab") {
        event.preventDefault();
        setTab((current) => tabs[(tabs.indexOf(current) + 1) % tabs.length]);
        setActiveIndex(0);
      } else if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        router.push(filtered[activeIndex].href);
        close();
      }
    };
    document.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeys);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeys);
    };
  }, [activeIndex, close, filtered, open, openPalette, router]);

  useEffect(() => setActiveIndex(0), [query, tab]);

  if (!open) return null;

  let rowIndex = -1;
  const groups = [...new Set(filtered.map((result) => result.group))];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/45 px-3 pt-[12vh] backdrop-blur-sm sm:items-center sm:pt-0"
      onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh"
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        style={{ maxHeight: "min(700px, calc(100dvh - 24px))" }}
      >
        <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-100 px-4 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-[#2B54C3]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm hội thoại, liên hệ, tin nhắn, đơn hàng..."
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="Tìm kiếm nội dung"
          />
          <button onClick={close} className="rounded-md border border-slate-200 px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50" aria-label="Đóng (Escape)">ESC</button>
        </div>
        <div className="inbox-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-5" role="tablist" aria-label="Lọc kết quả tìm kiếm">
          {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${tab === item ? "bg-blue-50 text-[#2B54C3]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>{item}</button>)}
        </div>
        <div className="inbox-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
          {filtered.length ? groups.map((group) => (
            <div key={group} className="pb-2">
              <h2 className="px-3 pb-1 pt-2 text-[10px] font-bold tracking-[0.12em] text-slate-400">{group.toLocaleUpperCase("vi")}</h2>
              {filtered.filter((result) => result.group === group).map((result) => {
                rowIndex += 1;
                const selected = rowIndex === activeIndex;
                const Icon = result.icon;
                return <button
                  key={`${result.group}-${result.title}`}
                  onMouseEnter={() => setActiveIndex(rowIndex)}
                  onClick={() => { router.push(result.href); close(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${selected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-white text-[#2B54C3] shadow-sm" : "bg-slate-100 text-slate-500"}`}><Icon className="h-[18px] w-[18px]" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-slate-800">{result.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{result.subtitle}</span></span>
                  <span className="hidden text-[10px] text-slate-400 sm:block">{result.group}</span>
                </button>;
              })}
            </div>
          )) : <div className="px-4 py-12 text-center"><Search className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-medium text-slate-600">Không tìm thấy kết quả</p><p className="mt-1 text-xs text-slate-400">Thử từ khóa khác để tìm kiếm.</p></div>}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:px-5">
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans">↑</kbd><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans">↓</kbd>Di chuyển</span>
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans">↵</kbd>Mở</span>
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans">Tab</kbd>Đổi nhóm</span>
          <span className="ml-auto hidden items-center gap-1 sm:inline-flex"><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans">ESC</kbd>Đóng</span>
        </footer>
      </section>
    </div>
  );
}
