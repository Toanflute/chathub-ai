"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine, ArrowUpFromLine, Bell, CalendarDays, Check, ChevronDown, ChevronRight,
  ContactRound, Eye, FileText, Filter, LayoutGrid, Link2, Menu, MessageCircle, MoreHorizontal,
  Plus, Search, SlidersHorizontal, ArrowUpDown, X,
} from "lucide-react";

type Contact = {
  id: number;
  name: string;
  initials: string;
  color: string;
  phone: string;
  channel: string;
  balance: string;
  location: string;
  connected: boolean;
};

const contacts: Contact[] = [
  { id: 1, name: "Bùi Gia Huy", initials: "BH", color: "bg-rose-100 text-rose-700", phone: "Chưa có thông tin liên lạc", channel: "Chat Plugin", balance: "0", location: "Hue, Việt Nam", connected: false },
  { id: 2, name: "Hoàng Bảo Ngọc", initials: "HN", color: "bg-orange-100 text-orange-700", phone: "0977333444", channel: "Telegram Bot", balance: "20.000", location: "Nha Trang, Việt Nam", connected: true },
  { id: 3, name: "Vũ Anh Tuấn", initials: "VT", color: "bg-sky-100 text-sky-700", phone: "0967222333", channel: "Facebook", balance: "0", location: "Cần Thơ, Việt Nam", connected: true },
  { id: 4, name: "Nguyễn Thu Hà", initials: "NH", color: "bg-violet-100 text-violet-700", phone: "0901234567", channel: "Facebook", balance: "0", location: "Hồ Chí Minh, Việt Nam", connected: true },
  { id: 5, name: "Phạm Hoàng Long", initials: "PL", color: "bg-emerald-100 text-emerald-700", phone: "0933456789", channel: "Telegram Bot", balance: "5.000", location: "Hà Nội, Việt Nam", connected: true },
  { id: 6, name: "Trần Minh Anh", initials: "MA", color: "bg-amber-100 text-amber-700", phone: "Chưa có thông tin liên lạc", channel: "Chat Plugin", balance: "0", location: "Đà Nẵng, Việt Nam", connected: false },
  { id: 7, name: "Lê Quỳnh Chi", initials: "LC", color: "bg-pink-100 text-pink-700", phone: "0912345678", channel: "Facebook", balance: "0", location: "Cần Thơ, Việt Nam", connected: true },
  { id: 8, name: "Đỗ Đức Thành", initials: "DT", color: "bg-indigo-100 text-indigo-700", phone: "0987654321", channel: "Telegram Bot", balance: "0", location: "Huế, Việt Nam", connected: true },
];

const tabs = ["Tất cả", "Đã kết nối", "Chưa kết nối"] as const;
type Tab = typeof tabs[number];
const sortOptions = ["Khách hàng", "Số dư", "Ngày tạo hồ sơ", "Hoạt động"];

export default function ContactsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Tất cả");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Ngày tạo hồ sơ");
  const [filterOpen, setFilterOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [extraFilter, setExtraFilter] = useState("Tất cả");

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return contacts.filter((contact) => {
      const matchesTab = tab === "Tất cả" || (tab === "Đã kết nối" ? contact.connected : !contact.connected);
      const matchesQuery = !normalizedQuery || `${contact.name} ${contact.phone} ${contact.channel} ${contact.location}`.toLocaleLowerCase("vi").includes(normalizedQuery);
      const matchesChannel = extraFilter === "Tất cả" || contact.channel === extraFilter;
      return matchesTab && matchesQuery && matchesChannel;
    });
  }, [extraFilter, query, tab]);

  function openMenu() { window.dispatchEvent(new Event("chathub:open-navigation")); }
  function toggleContact(id: number) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function toggleAll() { setSelected((current) => filteredContacts.length > 0 && filteredContacts.every((contact) => current.includes(contact.id)) ? current.filter((id) => !filteredContacts.some((contact) => contact.id === id)) : [...new Set([...current, ...filteredContacts.map((contact) => contact.id)])]); }
  function showDemoMessage(message: string) { setNotice(message); setActionsOpen(false); window.setTimeout(() => setNotice(""), 3000); }

  return <main className="flex min-h-[100dvh] flex-col bg-[#F4F6F9] pb-[76px] text-slate-800 lg:pb-0">
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between bg-[#131722] px-4 text-white sm:px-6 lg:pl-[276px]">
      <button onClick={openMenu} className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold lg:left-[calc(50%+130px)]">Liên hệ</h1>
      <div className="flex items-center gap-1">
        <button aria-label="Tìm kiếm" onClick={() => document.dispatchEvent(new MouseEvent("click", { bubbles: true }))} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Search className="h-[18px] w-[18px]" /></button>
        <button aria-label="Thông báo: 3" className="relative rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">3</span></button>
      </div>
    </header>
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[#E6C994] bg-[#FDF6E7] px-3 py-2 text-center text-xs text-[#73521C] sm:text-[13px]"><Eye className="h-4 w-4 shrink-0" /><span>Bản demo — bạn xem được mọi thứ nhưng không thêm, sửa hay xoá dữ liệu.</span></div>

    <section className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:py-7 lg:pl-[284px]">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">Khách hàng</p><p className="mt-1 text-xs text-slate-500">Quản lý thông tin và hoạt động của khách hàng</p></div>
        <div className="relative flex items-center gap-2">
          <button type="button" aria-label="Thao tác khác" aria-expanded={actionsOpen} onClick={() => setActionsOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"><MoreHorizontal className="h-5 w-5" /></button>
          {actionsOpen && <><button aria-label="Đóng menu thao tác" className="fixed inset-0 z-30 cursor-default" onClick={() => setActionsOpen(false)} /><div className="absolute right-0 top-12 z-40 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button onClick={() => showDemoMessage("Xuất dữ liệu không khả dụng trong bản demo.")} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"><ArrowDownToLine className="h-4 w-4 text-slate-500" />Xuất dữ liệu</button><button onClick={() => showDemoMessage("Nhập dữ liệu không khả dụng trong bản demo.")} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50"><ArrowUpFromLine className="h-4 w-4 text-slate-500" />Nhập dữ liệu</button></div></>}
          <button type="button" onClick={() => setInfoOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2B54C3] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus className="h-4 w-4" />Thêm</button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-5 border-b border-slate-200" role="tablist" aria-label="Trạng thái liên hệ">
        {tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`relative h-11 text-xs font-semibold transition ${tab === item ? "text-[#2B54C3]" : "text-slate-500 hover:text-slate-800"}`}>{item}{tab === item && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2B54C3]" />}</button>)}
      </div>

      <div className="mt-4 flex gap-2.5">
        <label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm liên hệ..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
        <button type="button" onClick={() => setFilterOpen(true)} aria-label="Lọc liên hệ" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><SlidersHorizontal className="h-[18px] w-[18px]" /></button>
        <div className="relative">
          <button type="button" onClick={() => setSortOpen((value) => !value)} aria-label="Sắp xếp liên hệ" aria-expanded={sortOpen} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowUpDown className="h-[18px] w-[18px]" /></button>
          {sortOpen && <><button aria-label="Đóng menu sắp xếp" className="fixed inset-0 z-30 cursor-default" onClick={() => setSortOpen(false)} /><div className="absolute right-0 top-12 z-40 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{sortOptions.map((option) => <button key={option} onClick={() => { setSortBy(option); setSortOpen(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50">{option}{sortBy === option && <Check className="h-4 w-4 text-[#2B54C3]" />}</button>)}</div></>}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={filteredContacts.length > 0 && filteredContacts.every((contact) => selected.includes(contact.id))} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 accent-[#2B54C3]" />Chọn cả trang</label>
        <span className="text-xs text-slate-500"><strong className="font-semibold text-slate-700">{filteredContacts.length}</strong> liên hệ</span>
      </div>

      <div className="mt-3 space-y-2.5">
        {filteredContacts.map((contact) => <article key={contact.id} className={`rounded-2xl border bg-white transition hover:border-blue-200 hover:shadow-sm ${selected.includes(contact.id) ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-200"}`}>
          <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:px-5 sm:py-4">
            <input aria-label={`Chọn ${contact.name}`} type="checkbox" checked={selected.includes(contact.id)} onChange={() => toggleContact(contact.id)} className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2B54C3]" />
            <button type="button" onClick={() => router.push(`/dashboard?conversation=${contact.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left sm:gap-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${contact.color}`}>{contact.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="truncate text-[13px] font-semibold text-slate-900 sm:text-sm">{contact.name}</span><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"><Link2 className="h-3 w-3" />{contact.channel}</span></span>
                <span className="mt-1 block truncate text-[11px] text-slate-500">{contact.phone}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400"><span className="inline-flex items-center gap-1"><i className={`h-1.5 w-1.5 rounded-full ${contact.connected ? "bg-emerald-500" : "bg-slate-300"}`} />{contact.location}</span><span>{contact.connected ? "Đã kết nối" : "Chưa kết nối"}</span></span>
              </span>
              <span className="flex shrink-0 items-center gap-2 sm:gap-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${contact.balance === "0" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-[#2B54C3]"}`}>{contact.balance}</span><ChevronRight className="h-4 w-4 text-slate-400" /></span>
            </button>
          </div>
        </article>)}
        {!filteredContacts.length && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center"><ContactRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Không tìm thấy liên hệ</p><p className="mt-1 text-xs text-slate-400">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
      </div>
      {notice && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl lg:bottom-5">{notice}</div>}
    </section>

    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[66px] items-end justify-around border-t border-slate-200 bg-white px-1 pb-1 shadow-[0_-5px_20px_rgba(15,23,42,0.04)] lg:hidden" aria-label="Điều hướng chính">
      <button onClick={() => router.push("/contacts")} className="flex w-1/5 flex-col items-center gap-1 pb-1 text-[#2B54C3]"><ContactRound className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Liên hệ</span></button>
      <button className="relative flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><FileText className="h-[19px] w-[19px]" /><span className="text-[9px]">Đơn hàng</span><span className="absolute left-[58%] top-[-2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">5</span></button>
      <button onClick={() => router.push("/dashboard")} className="relative flex w-1/5 flex-col items-center pb-1 text-[#2B54C3]"><span className="absolute -top-7 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[4px] border-white bg-[#2B54C3] text-white shadow-lg"><MessageCircle className="h-6 w-6" /></span><span className="relative mt-[29px] text-[9px]">Tin nhắn</span><span className="absolute right-[14%] top-[-29px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-800 px-1 text-[8px] font-bold text-white">7</span></button>
      <button className="flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><CalendarDays className="h-[19px] w-[19px]" /><span className="text-[9px]">Lịch hẹn</span></button>
      <button onClick={openMenu} className="relative flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><LayoutGrid className="h-[19px] w-[19px]" /><span className="text-[9px]">Khác</span><span className="absolute left-[58%] top-[-2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">3</span></button>
    </nav>

    {filterOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="contact-filter-title" className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="contact-filter-title" className="text-base font-bold text-slate-900">Bộ lọc liên hệ</h2><button onClick={() => setFilterOpen(false)} aria-label="Đóng bộ lọc" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {["Thẻ liên hệ", "Kênh mạng xã hội", "Nhân viên phụ trách", "Thời gian tạo", "Bộ lọc khác"].map((label) => <label key={label} className="block text-xs font-medium text-slate-600">{label}<span className="relative mt-1.5 block"><select value={label === "Kênh mạng xã hội" ? extraFilter : undefined} onChange={(event) => { if (label === "Kênh mạng xã hội") setExtraFilter(event.target.value); }} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-700 outline-none focus:border-blue-300"><option>{label === "Thời gian tạo" ? "Mọi thời gian" : "Tất cả"}</option>{label === "Kênh mạng xã hội" && <><option>Chat Plugin</option><option>Telegram Bot</option><option>Facebook</option></>}</select><ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" /></span></label>)}
        </div>
        <footer className="flex justify-end border-t border-slate-100 p-4"><button onClick={() => setFilterOpen(false)} className="rounded-lg bg-[#2B54C3] px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Đóng</button></footer>
      </section>
    </div>}

    {infoOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setInfoOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="demo-info-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="demo-info-title" className="text-base font-bold text-slate-900">Thêm liên hệ</h2><p className="mt-2 text-sm leading-6 text-slate-500">Đây là bản demo. Bạn có thể xem dữ liệu nhưng không thể thêm, sửa hoặc xoá.</p></div><button onClick={() => setInfoOpen(false)} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div><button onClick={() => setInfoOpen(false)} className="mt-5 w-full rounded-lg bg-[#2B54C3] px-4 py-2.5 text-xs font-semibold text-white">Đóng</button></section></div>}
  </main>;
}
