"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Bell, CalendarDays, Check, ChevronDown, ChevronRight, Clock3, ContactRound,
  Eye, FileText, Filter, LayoutGrid, Menu, MessageCircle, Package, Pencil, RefreshCw,
  Search, SlidersHorizontal, X,
} from "lucide-react";

type OrderStatus = "Chờ xử lý" | "Đang xử lý" | "Đã giao" | "Đã huỷ";
type Order = {
  id: number;
  code: string;
  sku: string;
  product: string;
  quantity: number;
  customer: string;
  initials: string;
  avatar: string;
  phone: string;
  date: string;
  amount: number;
  status: OrderStatus;
  note: string;
  orderInfo: string;
  shipping: string;
  workflow: string;
};

const initialOrders: Order[] = [
  { id: 7, code: "#EMO-OR-7", sku: "GOODS-TSHIRT", product: "Áo thun cotton in logo cửa hàng", quantity: 2, customer: "Bùi Gia Huy", initials: "BH", avatar: "bg-rose-100 text-rose-700", phone: "0901234567", date: "22:00 10/9/26", amount: 500000, status: "Chờ xử lý", note: "Khách hẹn giao lại sáng mai...", orderInfo: "Khách đặt áo thun cotton, vui lòng gọi trước khi giao.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 8, code: "#EMO-OR-8", sku: "GOODS-TSHIRT", product: "Áo thun cotton in logo cửa hàng", quantity: 1, customer: "Hoàng Bảo Ngọc", initials: "HN", avatar: "bg-orange-100 text-orange-700", phone: "0977333444", date: "20:35 10/9/26", amount: 250000, status: "Chờ xử lý", note: "", orderInfo: "Đơn hàng đặt qua Telegram Bot.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 9, code: "#EMO-OR-9", sku: "GOODS-TSHIRT", product: "Áo thun cotton in logo cửa hàng", quantity: 1, customer: "Vũ Anh Tuấn", initials: "VT", avatar: "bg-sky-100 text-sky-700", phone: "0967222333", date: "18:10 10/9/26", amount: 250000, status: "Chờ xử lý", note: "", orderInfo: "Khách muốn nhận hàng trong giờ hành chính.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 10, code: "#EMO-OR-10", sku: "GOODS-MUG", product: "Ly sứ in logo cửa hàng", quantity: 2, customer: "Nguyễn Thu Hà", initials: "NH", avatar: "bg-violet-100 text-violet-700", phone: "0901234567", date: "16:40 10/9/26", amount: 180000, status: "Đang xử lý", note: "", orderInfo: "Đơn đã được xác nhận, đang chuẩn bị hàng.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 11, code: "#EMO-OR-11", sku: "GOODS-BAG", product: "Túi tote canvas ChatHub", quantity: 1, customer: "Phạm Hoàng Long", initials: "PL", avatar: "bg-emerald-100 text-emerald-700", phone: "0933456789", date: "15:12 10/9/26", amount: 120000, status: "Đang xử lý", note: "", orderInfo: "Đơn hàng đang được đóng gói.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 12, code: "#EMO-OR-12", sku: "GOODS-TSHIRT", product: "Áo thun cotton in logo cửa hàng", quantity: 1, customer: "Trần Minh Anh", initials: "MA", avatar: "bg-amber-100 text-amber-700", phone: "0911111222", date: "14:22 09/9/26", amount: 250000, status: "Đã giao", note: "", orderInfo: "Đã giao hàng thành công.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 13, code: "#EMO-OR-13", sku: "GOODS-MUG", product: "Ly sứ in logo cửa hàng", quantity: 3, customer: "Lê Quỳnh Chi", initials: "LC", avatar: "bg-pink-100 text-pink-700", phone: "0912345678", date: "12:08 09/9/26", amount: 270000, status: "Đã giao", note: "", orderInfo: "Khách đã nhận đủ hàng.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 14, code: "#EMO-OR-14", sku: "GOODS-BAG", product: "Túi tote canvas ChatHub", quantity: 2, customer: "Đỗ Đức Thành", initials: "DT", avatar: "bg-indigo-100 text-indigo-700", phone: "0987654321", date: "10:45 09/9/26", amount: 240000, status: "Đã giao", note: "", orderInfo: "Đã giao hàng thành công.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 15, code: "#EMO-OR-15", sku: "GOODS-TSHIRT", product: "Áo thun cotton in logo cửa hàng", quantity: 2, customer: "Vũ Ngọc Mai", initials: "VM", avatar: "bg-cyan-100 text-cyan-700", phone: "0928901234", date: "09:30 08/9/26", amount: 500000, status: "Đã giao", note: "", orderInfo: "Khách đã nhận hàng, không có vấn đề.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
  { id: 16, code: "#EMO-OR-16", sku: "GOODS-MUG", product: "Ly sứ in logo cửa hàng", quantity: 1, customer: "Lê Minh Khoa", initials: "LK", avatar: "bg-teal-100 text-teal-700", phone: "0909988776", date: "08:15 08/9/26", amount: 90000, status: "Đã huỷ", note: "Khách đổi ý sau khi đặt.", orderInfo: "Đơn hàng đã được huỷ theo yêu cầu khách.", shipping: "Nội dung dùng chung", workflow: "Workflow bán tự động" },
];

const statusStyles: Record<OrderStatus, string> = {
  "Chờ xử lý": "bg-amber-50 text-amber-700",
  "Đang xử lý": "bg-blue-50 text-blue-700",
  "Đã giao": "bg-emerald-50 text-emerald-700",
  "Đã huỷ": "bg-rose-50 text-rose-700",
};
const statusOptions: Array<OrderStatus | "Tất cả"> = ["Tất cả", "Chờ xử lý", "Đang xử lý", "Đã giao", "Đã huỷ"];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "Tất cả">("Tất cả");
  const [expanded, setExpanded] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Order | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [pageSize, setPageSize] = useState("20");
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const searchable = `${order.code} ${order.product} ${order.customer} ${order.sku}`.toLocaleLowerCase("vi");
    return (!query.trim() || searchable.includes(query.trim().toLocaleLowerCase("vi"))) && (filterStatus === "Tất cả" || order.status === filterStatus);
  }), [filterStatus, orders, query]);
  const counts = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === "Chờ xử lý").length,
    processing: orders.filter((order) => order.status === "Đang xử lý").length,
    delivered: orders.filter((order) => order.status === "Đã giao").length,
    cancelled: orders.filter((order) => order.status === "Đã huỷ").length,
  }), [orders]);

  function openMenu() { window.dispatchEvent(new Event("chathub:open-navigation")); }
  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2800); }
  function toggleExpanded(id: number) { setExpanded((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function toggleAll() { setSelected((current) => filteredOrders.length > 0 && filteredOrders.every((order) => current.includes(order.id)) ? current.filter((id) => !filteredOrders.some((order) => order.id === id)) : [...new Set([...current, ...filteredOrders.map((order) => order.id)])]); }
  function beginEdit(order: Order) { setEditing(order); setNoteDraft(order.note); }
  function saveEdit() {
    if (!editing) return;
    setOrders((current) => current.map((order) => order.id === editing.id ? { ...order, note: noteDraft } : order));
    setEditing(null);
    flash("Đã lưu ghi chú nội bộ.");
  }
  function updateStatus(order: Order, status: OrderStatus) {
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    setEditing(null);
    flash(status === "Đã huỷ" ? "Đơn hàng đã được huỷ trong bản demo." : "Đã cập nhật trạng thái đơn hàng.");
  }

  const statCard = (label: string, value: number, tone: string, icon: typeof Package, full = false) => {
    const Icon = icon;
    return <article className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${full ? "col-span-2" : ""}`}><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-[18px] w-[18px]" /></span></div><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p></article>;
  };

  return <main className="flex min-h-[100dvh] flex-col bg-[#F4F6F9] pb-[76px] text-slate-800 lg:pb-0">
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between bg-[#131722] px-4 text-white sm:px-6 lg:pl-[276px]">
      <button onClick={openMenu} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Mở menu"><Menu className="h-5 w-5" /></button>
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-semibold lg:left-[calc(50%+130px)]">Đơn hàng</h1>
      <div className="flex items-center gap-1"><button aria-label="Tìm kiếm" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Search className="h-[18px] w-[18px]" /></button><button aria-label="Thông báo: 3" className="relative rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">3</span></button></div>
    </header>
    <div className="flex shrink-0 items-center justify-center gap-2 border-b border-[#E6C994] bg-[#FDF6E7] px-3 py-2 text-center text-xs text-[#73521C] sm:text-[13px]"><Eye className="h-4 w-4 shrink-0" /><span>Bản demo — bạn xem được mọi thứ nhưng không thêm, sửa hay xoá dữ liệu.</span></div>

    <section className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 lg:py-7 lg:pl-[284px]">
      <h2 className="mb-3 text-lg font-bold text-slate-900">Tổng quan đơn hàng</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {statCard("Tổng đơn hàng", counts.total, "bg-blue-50 text-[#2B54C3]", Package, true)}
        {statCard("Chờ xử lý", counts.pending, "bg-amber-50 text-amber-600", Clock3)}
        {statCard("Đang xử lý", counts.processing, "bg-blue-50 text-blue-600", RefreshCw)}
        {statCard("Đã giao", counts.delivered, "bg-emerald-50 text-emerald-600", Check)}
        {statCard("Đã huỷ", counts.cancelled, "bg-rose-50 text-rose-600", X)}
      </div>

      <section className="mt-7">
        <header className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Danh sách đơn hàng</h2><button onClick={() => { setRefreshKey((key) => key + 1); flash("Danh sách đơn hàng đã được làm mới."); }} aria-label="Làm mới danh sách" className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-[#2B54C3]"><RefreshCw className={`h-[18px] w-[18px] ${refreshKey ? "" : ""}`} /></button></header>
        <div className="mt-3 flex gap-2"><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm đơn hàng..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label><button onClick={() => setFilterOpen(true)} aria-label="Lọc đơn hàng" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><SlidersHorizontal className="h-[18px] w-[18px]" /></button></div>
        <div className="mt-4 flex items-center justify-between gap-3"><label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={filteredOrders.length > 0 && filteredOrders.every((order) => selected.includes(order.id))} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 accent-[#2B54C3]" />Chọn cả tổng</label><span className="text-xs text-slate-500"><strong className="font-semibold text-slate-700">{filteredOrders.length}</strong> đơn hàng</span></div>

        <div className="mt-3 space-y-3" key={refreshKey}>
          {filteredOrders.map((order) => <article key={order.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected.includes(order.id) ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-200"}`}>
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3"><input aria-label={`Chọn đơn ${order.code}`} type="checkbox" checked={selected.includes(order.id)} onChange={() => setSelected((current) => current.includes(order.id) ? current.filter((id) => id !== order.id) : [...current, order.id])} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2B54C3]" /><div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-[13px] font-bold text-slate-900 sm:text-sm">{order.product}</h3><span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-[#2B54C3]">x{order.quantity}</span></div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500"><code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">{order.code}</code><span>{order.sku}</span><span className="hidden text-slate-300 sm:inline">·</span><span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" />{order.workflow}</span></div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-medium text-slate-700"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${order.avatar}`}>{order.initials}</span>{order.customer}</span><span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="h-3.5 w-3.5" />{order.date}</span></div>
                <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-900">{order.amount.toLocaleString("vi-VN")} Credits</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[order.status]}`}><span className="mr-1">•</span>{order.status}</span></div>
              </div></div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => toggleExpanded(order.id)} aria-expanded={expanded.includes(order.id)} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">Chi tiết <ChevronDown className={`h-3.5 w-3.5 transition ${expanded.includes(order.id) ? "rotate-180" : ""}`} /></button>
                {order.status === "Chờ xử lý" && <button onClick={() => updateStatus(order, "Đã giao")} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2B54C3] px-3 text-xs font-semibold text-white hover:bg-blue-700 sm:flex-none"><Check className="h-4 w-4" />Duyệt & giao</button>}
                <button onClick={() => beginEdit(order)} aria-label={`Sửa đơn ${order.code}`} title="Sửa đơn hàng" className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#2B54C3]"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => router.push(`/dashboard?conversation=${order.id % 8 + 1}`)} aria-label={`Nhắn tin với ${order.customer}`} title="Mở hội thoại" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#2B54C3]"><MessageCircle className="h-4 w-4" /></button>
              </div>
            </div>
            {expanded.includes(order.id) && <div className="border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5"><div className="grid gap-4 sm:grid-cols-2"><div><h4 className="text-[11px] font-bold text-slate-700">Thông tin đặt hàng</h4><p className="mt-1.5 text-xs leading-5 text-slate-500">{order.orderInfo}{order.note ? ` Ghi chú: ${order.note}` : ""}</p></div><div><h4 className="text-[11px] font-bold text-slate-700">Thông tin xử lý</h4><dl className="mt-1.5 space-y-1 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-500">Mã đơn</dt><dd className="font-mono text-slate-700">demo-or-{order.id}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Kiểu giao hàng</dt><dd className="text-right text-slate-700">{order.shipping}</dd></div></dl></div></div><div className="mt-3 flex justify-end"><button onClick={() => beginEdit(order)} className="rounded-lg bg-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-300">Sửa đơn</button></div></div>}
          </article>)}
          {!filteredOrders.length && <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center"><Package className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Không tìm thấy đơn hàng</p><p className="mt-1 text-xs text-slate-400">Thử từ khóa hoặc bộ lọc khác.</p></div>}
        </div>
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-500 sm:px-4"><span>1–{filteredOrders.length} trong {filteredOrders.length}</span><div className="flex items-center gap-2"><button disabled aria-label="Trang trước" className="rounded-md border border-slate-200 p-1.5 text-slate-300"><ArrowLeft className="h-3.5 w-3.5" /></button><span>Trang 1/1</span><button disabled aria-label="Trang sau" className="rounded-md border border-slate-200 p-1.5 text-slate-300"><ArrowRight className="h-3.5 w-3.5" /></button><select value={pageSize} onChange={(event) => setPageSize(event.target.value)} aria-label="Số đơn hàng mỗi trang" className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] outline-none"><option value="10">10 / trang</option><option value="20">20 / trang</option><option value="50">50 / trang</option></select></div></footer>
      </section>
      {notice && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl lg:bottom-5">{notice}</div>}
    </section>

    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[66px] items-end justify-around border-t border-slate-200 bg-white px-1 pb-1 shadow-[0_-5px_20px_rgba(15,23,42,0.04)] lg:hidden" aria-label="Điều hướng chính">
      <button onClick={() => router.push("/contacts")} className="flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><ContactRound className="h-[19px] w-[19px]" /><span className="text-[9px]">Liên hệ</span></button>
      <button onClick={() => router.push("/orders")} className="relative flex w-1/5 flex-col items-center gap-1 pb-1 text-[#2B54C3]"><FileText className="h-[19px] w-[19px]" /><span className="text-[9px] font-semibold">Đơn hàng</span><span className="absolute left-[58%] top-[-2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">5</span></button>
      <button onClick={() => router.push("/dashboard")} className="relative flex w-1/5 flex-col items-center pb-1 text-[#2B54C3]"><span className="absolute -top-7 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[4px] border-white bg-[#2B54C3] text-white shadow-lg"><MessageCircle className="h-6 w-6" /></span><span className="relative mt-[29px] text-[9px]">Tin nhắn</span><span className="absolute right-[14%] top-[-29px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-800 px-1 text-[8px] font-bold text-white">7</span></button>
      <button className="flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><CalendarDays className="h-[19px] w-[19px]" /><span className="text-[9px]">Lịch hẹn</span></button>
      <button onClick={openMenu} className="relative flex w-1/5 flex-col items-center gap-1 pb-1 text-slate-400"><LayoutGrid className="h-[19px] w-[19px]" /><span className="text-[9px]">Khác</span><span className="absolute left-[58%] top-[-2px] flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">3</span></button>
    </nav>

    {filterOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="order-filter-title" className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="order-filter-title" className="text-base font-bold text-slate-900">Bộ lọc đơn hàng</h2><button onClick={() => setFilterOpen(false)} aria-label="Đóng bộ lọc" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header><label className="block p-5 text-xs font-medium text-slate-600">Trạng thái đơn hàng<select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as OrderStatus | "Tất cả")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-blue-300">{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label><footer className="flex justify-end border-t border-slate-100 p-4"><button onClick={() => setFilterOpen(false)} className="rounded-lg bg-[#2B54C3] px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Áp dụng</button></footer></section></div>}

    {editing && <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section role="dialog" aria-modal="true" aria-labelledby="edit-order-title" className="max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 id="edit-order-title" className="text-base font-bold text-slate-900">Sửa đơn hàng</h2><button onClick={() => setEditing(null)} aria-label="Đóng" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header><div className="space-y-5 p-5"><p className="text-xs leading-5 text-slate-500">Đơn {editing.code} · {editing.product}. Sửa ở đây không đổi số lượng, giá hay trạng thái của đơn.</p><div><h3 className="text-sm font-bold text-slate-800">Thông tin đặt hàng</h3><p className="mt-1 text-xs leading-5 text-slate-500">{editing.orderInfo}</p></div><label className="block text-xs font-semibold text-slate-700">Ghi chú nội bộ<textarea rows={4} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Nhập ghi chú nội bộ..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /><span className="mt-1.5 block text-[11px] font-normal text-slate-400">Chỉ người trong shop đọc được; khách không thấy ghi chú này.</span></label><section className="rounded-xl border border-slate-200 p-4"><h3 className="text-xs font-bold text-slate-800">Huỷ đơn</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">Huỷ đơn sẽ hoàn tiền vào ví khách và trả những mã chưa gửi về kho.</p><button onClick={() => updateStatus(editing, "Đã huỷ")} disabled={editing.status === "Đã huỷ"} className="mt-3 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40">⊘ Huỷ</button></section></div><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Đóng</button><button onClick={saveEdit} className="rounded-lg bg-[#2B54C3] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Lưu thay đổi</button></footer></section></div>}
  </main>;
}
