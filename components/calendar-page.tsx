"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bell, Bot, CalendarDays, Check, ChevronDown, Clock3,
  ContactRound, Eye, FileText, LayoutGrid, Menu, MessageCircle, Plus, Search,
  Send, SlidersHorizontal, Sparkles, UserRound, X,
} from "lucide-react";

type ViewMode = "Ngày" | "Tuần" | "Tháng";
type AgentMessage = { role: "user" | "assistant"; text: string };
const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
const timeSlots = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
const customers = [
  { name: "Bùi Gia Huy", phone: "0901234567" },
  { name: "Hoàng Bảo Ngọc", phone: "0977333444" },
  { name: "Vũ Anh Tuấn", phone: "0967222333" },
  { name: "Nguyễn Thu Hà", phone: "0901234567" },
];
const services = ["Tư vấn sản phẩm", "Chăm sóc khách hàng", "Tư vấn đơn hàng", "Hỗ trợ kỹ thuật"];
const formatDate = (date: Date) => new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(date);
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function CalendarPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 10, 18));
  const [view, setView] = useState<ViewMode>("Tuần");
  const [showFilters, setShowFilters] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [employee, setEmployee] = useState("Tất cả nhân viên");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [bookingDate, setBookingDate] = useState("2026-11-18");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [service, setService] = useState("");
  const [assignee, setAssignee] = useState("Ai cũng được");
  const [selectedTime, setSelectedTime] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [notice, setNotice] = useState("");
  const [filterMenu, setFilterMenu] = useState(false);

  const weekStart = useMemo(() => {
    const date = new Date(selectedDate);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    return date;
  }, [selectedDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  }), [weekStart]);
  const rangeLabel = view === "Ngày"
    ? `ngày ${formatDate(selectedDate)}`
    : view === "Tháng"
      ? new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(selectedDate)
      : `${days[0].getDate()} – ${days[6].getDate()} tháng ${days[0].getMonth() + 1}, ${days[0].getFullYear()}`;
  const matchingCustomers = useMemo(() => customers.filter((item) => `${item.name} ${item.phone}`.toLocaleLowerCase("vi").includes(customerSearch.toLocaleLowerCase("vi"))), [customerSearch]);

  function openMenu() { window.dispatchEvent(new Event("chathub:open-navigation")); }
  function flash(text: string) { setNotice(text); window.setTimeout(() => setNotice(""), 3000); }
  function changeRange(amount: number) {
    const next = new Date(selectedDate);
    if (view === "Ngày") next.setDate(next.getDate() + amount);
    else if (view === "Tháng") next.setMonth(next.getMonth() + amount);
    else next.setDate(next.getDate() + amount * 7);
    setSelectedDate(next);
    setBookingDate(dateValue(next));
  }
  function openBooking(date = selectedDate) {
    setBookingDate(dateValue(date));
    setSelectedTime("");
    setBookingOpen(true);
  }
  function startNewAgentChat() { setAgentMessages([]); setAgentInput(""); }
  function agentPrompt(text: string) { setAgentInput(text); void sendAgentMessage(text); }
  function sendAgentMessage(forcedText?: string) {
    const text = (forcedText ?? agentInput).trim();
    if (!text) return;
    const turnCount = agentMessages.filter((message) => message.role === "user").length;
    if (turnCount >= 20) { flash("Cuộc trò chuyện đã đạt giới hạn 20 lượt. Hãy bắt đầu cuộc trò chuyện mới."); return; }
    const lower = text.toLocaleLowerCase("vi");
    const foundCustomer = customers.find((item) => lower.includes(item.name.toLocaleLowerCase("vi")) || (item.phone.length > 6 && lower.includes(item.phone)));
    const matchTime = text.match(/(?:[01]?\d|2[0-3])(?::[0-5]\d)?\s*(?:giờ)?/i);
    const detectedTime = matchTime ? timeSlots.find((slot) => slot.startsWith(matchTime[0].match(/\d{1,2}/)?.[0]?.padStart(2, "0") ?? "--")) : undefined;
    let answer = "Mình có thể xem lịch đang mở hoặc điền sẵn thông tin cho một lịch hẹn để bạn kiểm tra. Bạn có thể hỏi khung giờ trống hoặc yêu cầu đặt/dời lịch cụ thể.";
    if (lower.includes("trống") || lower.includes("chỗ trống") || lower.includes("khung nào")) {
      answer = `Ngày ${formatDate(selectedDate)} hiện chưa có cuộc hẹn nào trong bản demo, nên các khung từ 15:00 đến 23:00 đang được hiển thị là khả dụng. Chọn “Đặt lịch” để điền thông tin.`;
    } else if (lower.includes("dời") || lower.includes("chuyển")) {
      answer = "Mình đã chuẩn bị thao tác dời lịch dưới dạng bản nháp. Mở biểu mẫu đặt lịch để chọn khách, ngày và khung giờ mới; chưa có thay đổi nào được lưu.";
      setBookingDate(dateValue(selectedDate));
      setBookingOpen(true);
    } else if (lower.includes("đặt") || lower.includes("lịch") || foundCustomer) {
      answer = `Mình đã điền sẵn biểu mẫu${foundCustomer ? ` cho khách ${foundCustomer.name}` : ""}${detectedTime ? ` vào lúc ${detectedTime}` : ""}. Vui lòng kiểm tra thông tin trước khi tiếp tục; Agent không tự lưu lịch.`;
      if (foundCustomer) { setCustomer(foundCustomer.name); setCustomerSearch(foundCustomer.name); }
      if (detectedTime) setSelectedTime(detectedTime);
      setBookingDate(dateValue(selectedDate));
      setBookingOpen(true);
    }
    setAgentMessages((current) => [...current, { role: "user", text }, { role: "assistant", text: answer }]);
    setAgentInput("");
  }

  function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || !service || !selectedTime) { flash("Chọn khách, dịch vụ và khung giờ trước khi tiếp tục."); return; }
    setBookingOpen(false);
    flash("Bản demo: thông tin đã được kiểm tra nhưng lịch hẹn chưa được lưu.");
  }

  return <main className="flex min-h-[100dvh] flex-col bg-[#F4F6F9] pb-[76px] text-slate-800 lg:pb-0">
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between bg-[#131722] px-4 text-white sm:px-6 lg:pl-[276px]">
      <button onClick={openMenu} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold lg:left-[calc(50%+130px)]">Lịch hẹn</h1>
      <div className="flex items-center gap-1"><button aria-label="Tìm kiếm" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Search className="h-[18px] w-[18px]" /></button><button aria-label="Thông báo: 3" className="relative rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">3</span></button></div>
    </header>
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[#E6C994] bg-[#FDF6E7] px-3 py-2 text-center text-xs text-[#73521C] sm:text-[13px]"><Eye className="h-4 w-4 shrink-0" /><span>Bản demo — bạn xem được mọi thứ nhưng không thêm, sửa hay xoá dữ liệu.</span></div>

    <section className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:py-7 lg:pl-[284px]">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl">Lịch hẹn</h2><p className="mt-1 text-xs text-slate-500">Theo dõi lịch và khung giờ của đội ngũ.</p></div><div className="flex items-center gap-2"><button onClick={() => setAgentOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Sparkles className="h-4 w-4 text-violet-500" />Hỏi AI Agent</button><button onClick={() => openBooking()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2B54C3] px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><Plus className="h-4 w-4" />Đặt lịch</button></div></div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">{[["Tổng lịch", "0", "bg-blue-50 text-blue-600", CalendarDays], ["Chờ xác nhận", "0", "bg-amber-50 text-amber-600", Clock3], ["Đã xác nhận", "0", "bg-emerald-50 text-emerald-600", Check]].map(([label, count, color, Icon]) => { const Symbol = Icon as typeof CalendarDays; return <article key={label as string} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color as string}`}><Symbol className="h-4 w-4" /></span><p className="mt-3 text-[10px] font-medium text-slate-500 sm:text-xs">{label as string}</p><p className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">{count as string}</p></article>; })}</div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div className="flex items-center gap-2"><button onClick={() => changeRange(-1)} aria-label="Khoảng thời gian trước" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button><button onClick={() => { const today = new Date(2026, 10, 18); setSelectedDate(today); setBookingDate(dateValue(today)); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Hôm nay</button><button onClick={() => changeRange(1)} aria-label="Khoảng thời gian tiếp theo" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ArrowRight className="h-4 w-4" /></button><h3 className="ml-1 text-xs font-bold text-slate-800 sm:ml-2 sm:text-sm">{rangeLabel}</h3></div><div className="flex items-center gap-2"><div className="flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Chế độ xem lịch">{(["Ngày", "Tuần", "Tháng"] as const).map((item) => <button key={item} role="tab" aria-selected={view === item} onClick={() => setView(item)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold sm:px-3 sm:text-xs ${view === item ? "bg-white text-[#2B54C3] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{item}</button>)}</div><button onClick={() => setShowFilters((value) => !value)} aria-label="Tuỳ chọn bộ lọc" className={`rounded-lg border p-2 ${showFilters ? "border-blue-200 bg-blue-50 text-[#2B54C3]" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}><SlidersHorizontal className="h-4 w-4" /></button></div></header>
        {showFilters && <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5"><label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">Chọn ngày<input type="date" value={dateValue(selectedDate)} onChange={(event) => { if (event.target.value) setSelectedDate(new Date(`${event.target.value}T12:00:00`)); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]" /></label><label className="flex items-center gap-2 text-[11px] font-medium text-slate-600">Nhân viên<select value={employee} onChange={(event) => setEmployee(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px]"><option>Tất cả nhân viên</option><option>Admin</option><option>Nhân viên tư vấn</option></select></label><label className="inline-flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={showEnded} onChange={(event) => setShowEnded(event.target.checked)} className="accent-[#2B54C3]" />Hiện lịch đã kết thúc</label><span className="text-[10px] text-slate-400">{employee}</span></div>}
        <div className="inbox-scrollbar flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-3 sm:px-5">{days.map((date, index) => { const isSelected = date.toDateString() === selectedDate.toDateString(); const isToday = date.toDateString() === new Date(2026, 10, 18).toDateString(); return <button key={date.toISOString()} onClick={() => setSelectedDate(date)} className={`min-w-[72px] flex-1 rounded-xl border px-2 py-2.5 text-center transition sm:min-w-[90px] ${isSelected ? "border-[#2B54C3] bg-[#2B54C3] text-white shadow-sm" : "border-transparent bg-slate-50 text-slate-600 hover:border-blue-200 hover:bg-blue-50"}`}><span className={`block text-[10px] ${isSelected ? "text-blue-100" : "text-slate-400"}`}>{weekDays[index]}</span><span className="mt-1 block text-base font-bold">{date.getDate()}</span>{isToday && <span className={`mt-0.5 block text-[9px] ${isSelected ? "text-blue-100" : "text-[#2B54C3]"}`}>Hôm nay</span>}<span onClick={(event) => { event.stopPropagation(); openBooking(date); }} role="button" aria-label={`Thêm lịch ngày ${date.getDate()}`} className={`mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full ${isSelected ? "bg-white/15" : "bg-white text-[#2B54C3] shadow-sm"}`}><Plus className="h-3 w-3" /></span></button>; })}</div>
        <div className="flex min-h-[210px] flex-col items-center justify-center px-5 py-12 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#2B54C3]"><CalendarDays className="h-6 w-6" /></span><p className="mt-3 text-sm font-semibold text-slate-700">0 cuộc hẹn</p><p className="mt-1 text-xs text-slate-400">Chưa có lịch hẹn nào trong ngày {formatDate(selectedDate)}.</p><button onClick={() => openBooking(selectedDate)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" />Thêm lịch hẹn</button></div>
      </section>
      {notice && <div role="status" className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl lg:bottom-5">{notice}</div>}
    </section>

    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[66px] items-end justify-around border-t border-slate-200 bg-white px-1 pb-1 shadow-[0_-5px_20px_rgba(15,23,42,0.04)] lg:hidden" aria-label="Điều hướng chính"><button onClick={() => router.push("/contacts")} className="flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><ContactRound className="h-[19px] w-[19px]" /><span className="text-[9px]">Liên hệ</span></button><button onClick={() => router.push("/orders")} className="relative flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><FileText className="h-[19px] w-[19px]" /><span className="text-[9px]">Đơn hàng</span><span className="absolute left-[58%] top-[-2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">5</span></button><button onClick={() => router.push("/dashboard")} className="relative flex w-1/5 flex-col items-center pb-1 text-[#2B54C3]"><span className="absolute -top-7 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[4px] border-white bg-[#2B54C3] text-white shadow-lg"><MessageCircle className="h-6 w-6" /></span><span className="relative mt-[29px] text-[9px]">Tin nhắn</span><span className="absolute right-[14%] top-[-29px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-800 px-1 text-[8px] font-bold text-white">7</span></button><button onClick={() => setSelectedDate(new Date(2026, 10, 18))} className="flex w-1/5 flex-col items-center gap-1 pb-1 text-[#2B54C3]"><CalendarDays className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Lịch hẹn</span></button><button onClick={openMenu} className="relative flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><LayoutGrid className="h-[19px] w-[19px]" /><span className="text-[9px]">Khác</span><span className="absolute left-[58%] top-[-2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">3</span></button></nav>

    {agentOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAgentOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="agent-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"><header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Sparkles className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 id="agent-title" className="text-base font-bold text-slate-900">AI Agent lịch hẹn ✨</h2><p className="mt-1 text-xs leading-5 text-slate-500">Hỏi về lịch, hoặc nhờ Agent điền sẵn một thao tác để bạn duyệt.</p></div><button onClick={() => setAgentOpen(false)} aria-label="Đóng AI Agent" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3"><p className="text-[11px] text-slate-500">Agent chỉ nhìn khoảng ngày bạn đang mở.</p><button onClick={startNewAgentChat} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2B54C3] hover:text-blue-700"><Plus className="h-3.5 w-3.5" />Cuộc trò chuyện mới</button></div><div className="inbox-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-5">{!agentMessages.length && <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-bold text-slate-800">Agent đọc được lịch của bạn</h3></div><p className="mt-2 text-xs leading-5 text-slate-600">Hỏi ai tới lúc mấy giờ, khung nào còn trống, hay nhờ đặt và dời một cuộc hẹn. Agent không tự lưu gì — nó điền sẵn form để bạn đọc lại rồi bấm.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{[["Xem chỗ trống", "Khung nào của ngày mai còn nhận khách."], ["Đặt lịch", "Điền sẵn form đặt cho một khách."], ["Dời giờ", "Chuyển một cuộc hẹn sang khung khác."]].map(([title, description]) => <button key={title} onClick={() => agentPrompt(title === "Xem chỗ trống" ? "Ngày mai còn khung nào còn trống?" : title === "Đặt lịch" ? "Đặt lịch cho một khách" : "Dời giờ một cuộc hẹn")} className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"><span className="block text-xs font-semibold text-slate-800">{title}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</span></button>)}</div></div>}{agentMessages.map((message, index) => <div key={`${index}-${message.role}`} className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${message.role === "user" ? "ml-auto bg-[#2B54C3] text-white" : "mr-auto border border-slate-200 bg-slate-50 text-slate-700"}`}>{message.text}</div>)}</div><form onSubmit={(event) => { event.preventDefault(); sendAgentMessage(); }} className="border-t border-slate-100 p-4"><div className="flex items-end gap-2"><textarea rows={2} maxLength={4000} value={agentInput} onChange={(event) => setAgentInput(event.target.value)} placeholder="Ví dụ: mai còn khung nào còn trống?" className="min-h-[58px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /><button type="submit" disabled={!agentInput.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2B54C3] px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Send className="h-3.5 w-3.5" />Gửi</button></div><div className="mt-1.5 flex justify-between text-[10px] text-slate-400"><span>{agentInput.length}/4000 ký tự</span><span>Mỗi cuộc trò chuyện tối đa 20 lượt.</span></div></form></section></div>}

    {bookingOpen && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookingOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="booking-title" className="text-base font-bold text-slate-900">Đặt lịch hẹn</h2><p className="mt-1 text-xs text-slate-500">Chọn khách hàng, sau đó chọn một khung giờ khả dụng.</p></div><button onClick={() => setBookingOpen(false)} aria-label="Đóng biểu mẫu" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header><form onSubmit={submitBooking} className="inbox-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5"><section><h3 className="text-xs font-bold text-slate-800">Khách hàng & dịch vụ</h3><label className="mt-3 block text-[11px] font-medium text-slate-600">Tìm khách<div className="relative mt-1.5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={customerSearch} onChange={(event) => { setCustomerSearch(event.target.value); setCustomer(""); }} placeholder="Nhập tên hoặc số điện thoại" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-300" /></div><span className="mt-1 block text-[10px] text-slate-400">Nhập ít nhất 2 ký tự để tìm khách hàng</span></label>{customerSearch.length >= 2 && <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-slate-200">{matchingCustomers.length ? matchingCustomers.map((item) => <button type="button" key={item.name} onClick={() => { setCustomer(item.name); setCustomerSearch(item.name); }} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-blue-50"><span>{item.name}</span><span className="text-slate-400">{item.phone}</span></button>) : <p className="px-3 py-2 text-xs text-slate-400">Không tìm thấy khách hàng.</p>}</div>}<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-medium text-slate-600">Khách<select value={customer} onChange={(event) => { setCustomer(event.target.value); setCustomerSearch(event.target.value); }} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"><option value="">Chọn khách hàng</option>{customers.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><label className="text-[11px] font-medium text-slate-600">Dịch vụ<select required value={service} onChange={(event) => setService(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"><option value="">Chọn dịch vụ</option>{services.map((item) => <option key={item}>{item}</option>)}</select></label></div></section><section><h3 className="text-xs font-bold text-slate-800">Thời gian & người phụ trách</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-[11px] font-medium text-slate-600">Người phụ trách<select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"><option>Ai cũng được</option><option>Admin</option><option>Nhân viên tư vấn</option></select></label><label className="text-[11px] font-medium text-slate-600">Ngày hẹn<input type="date" required value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs" /></label></div><p className="mt-3 text-[11px] font-medium text-slate-600">Khung giờ khả dụng</p><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{timeSlots.map((slot) => <button type="button" key={slot} onClick={() => setSelectedTime(slot)} className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${selectedTime === slot ? "border-[#2B54C3] bg-blue-50 text-[#2B54C3] ring-1 ring-blue-200" : "border-slate-200 text-slate-600 hover:border-blue-300 hover:text-[#2B54C3]"}`}>{slot}</button>)}</div></section><label className="block text-[11px] font-medium text-slate-600">Ghi chú<textarea rows={3} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Ghi cho nhân viên đọc, khách không thấy" className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-blue-300" /></label></form><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={() => setBookingOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Đóng</button><button type="button" onClick={() => { if (!customer || !service || !selectedTime) { flash("Chọn khách, dịch vụ và khung giờ trước khi tiếp tục."); return; } setBookingOpen(false); flash("Bản demo: thông tin đã được kiểm tra nhưng lịch hẹn chưa được lưu."); }} className="rounded-lg bg-[#2B54C3] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Đặt lịch</button></footer></section></div>}
  </main>;
}
