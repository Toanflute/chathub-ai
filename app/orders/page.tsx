"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  Inbox,
  Menu,
  MessageSquare,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MainNavigation from "@/components/main-navigation";
import NotificationDrawer, { type NotificationItem } from "@/components/notification-drawer";
import TopbarNavigation from "@/components/topbar-navigation";
import { useSettings } from "@/context/SettingsContext";

type OrderStatus = "pending" | "processing" | "delivered" | "cancelled";
type Order = {
  id: string;
  code: string;
  productName: string;
  quantity: number;
  category: string;
  workflow: string;
  total: number;
  currency: string;
  status: OrderStatus;
  placedAt: string;
  note: string;
  processingCode: string;
  deliveryType: string;
  contactId: string | null;
  customerName: string;
  customerPhone: string;
};
type OrderStats = Record<OrderStatus | "total", number>;
type Pagination = { page: number; pageSize: number; total: number; pageCount: number };

const emptyStats: OrderStats = { total: 0, pending: 0, processing: 0, delivered: 0, cancelled: 0 };
const statusDetails: Record<OrderStatus, { label: string; className: string; dot: string }> = {
  pending: { label: "Chờ xử lý", className: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  processing: { label: "Đang xử lý", className: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  delivered: { label: "Đã giao", className: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Đã huỷ", className: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};
const statusOptions: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "processing", label: "Đang xử lý" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã huỷ" },
];

function formatCredits(total: number, currency: string) {
  return `${total.toLocaleString("vi-VN")} ${currency}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "numeric",
    year: "2-digit",
  });
}

export default function OrdersPage() {
  const { settings } = useSettings();
  const configuredCurrency = settings.general?.currencyUnit ?? settings.general?.balanceLabel;
  const currencyUnit = typeof configuredCurrency === "string" && configuredCurrency.trim()
    ? configuredCurrency
    : "Credits";
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, pageCount: 1 });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [receivingEnabled, setReceivingEnabled] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationUnreadCount = notifications.filter((notification) => notification.unread).length;
  const pageOrderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const allVisibleSelected = pageOrderIds.length > 0 && pageOrderIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    let active = true;
    async function loadOrders() {
      setLoading(true);
      try {
        const parameters = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          q: query.trim(),
          status: statusFilter,
        });
        const [ordersResponse, notificationResponse] = await Promise.all([
          fetch(`/api/orders?${parameters.toString()}`),
          fetch("/api/notifications"),
        ]);
        const [ordersData, notificationData] = await Promise.all([ordersResponse.json(), notificationResponse.json()]);
        if (!ordersResponse.ok || !notificationResponse.ok) {
          throw new Error(ordersData.error ?? notificationData.error ?? "Không thể tải dữ liệu.");
        }
        if (!active) return;
        setOrders(ordersData.orders);
        setStats(ordersData.stats);
        setPagination(ordersData.pagination);
        setNotifications(notificationData.notifications);
        setSelectedIds((ids) => ids.filter((id) => ordersData.orders.some((order: Order) => order.id === id)));
      } catch (error) {
        if (active) showNotice(error instanceof Error ? error.message : "Không thể tải đơn hàng.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadOrders();
    return () => { active = false; };
  }, [page, pageSize, query, refreshKey, statusFilter]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  async function requestJson(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Yêu cầu không thành công.");
    return data;
  }

  async function applyOrderAction(order: Order, action: "deliver" | "cancel") {
    const confirmation = action === "cancel"
      ? `Huỷ đơn ${order.code} và hoàn ${formatCredits(order.total, currencyUnit)} vào ví khách?`
      : `Duyệt và giao đơn ${order.code}?`;
    if (!window.confirm(confirmation)) return;
    setSaving(true);
    try {
      await requestJson(`/api/orders/${order.id}`, "PATCH", { action });
      setRefreshKey((key) => key + 1);
      setEditingOrder(null);
      showNotice(action === "cancel" ? "Đã huỷ đơn và hoàn tiền vào ví khách." : "Đơn hàng đã được duyệt và giao.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.");
    } finally {
      setSaving(false);
    }
  }

  async function saveOrderNote(note: string) {
    if (!editingOrder) return;
    setSaving(true);
    try {
      await requestJson(`/api/orders/${editingOrder.id}`, "PATCH", { note });
      setOrders((current) => current.map((order) => order.id === editingOrder.id ? { ...order, note: note.trim() } : order));
      setEditingOrder(null);
      showNotice("Đã lưu thay đổi.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể lưu ghi chú.");
    } finally {
      setSaving(false);
    }
  }

  async function openCustomerChat(order: Order) {
    if (!order.contactId) {
      showNotice("Đơn hàng này không còn liên kết với liên hệ.");
      return;
    }
    try {
      const conversationsResponse = await fetch("/api/inbox/conversations");
      const conversationsData = await conversationsResponse.json();
      if (!conversationsResponse.ok) throw new Error(conversationsData.error ?? "Không thể tải hội thoại.");
      let conversation = conversationsData.conversations.find((item: { contactId: string | null }) => item.contactId === order.contactId);
      if (!conversation) {
        const created = await requestJson("/api/inbox/conversations", "POST", { contactId: order.contactId });
        conversation = created.conversation;
      }
      window.location.assign(`/inbox?conversation=${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể mở tin nhắn.");
    }
  }

  async function updateNotification(id: string, action: "read" | "delete" | "all") {
    try {
      if (action === "delete") {
        await requestJson(`/api/notifications?id=${encodeURIComponent(id)}`, "DELETE");
        setNotifications((current) => current.filter((item) => item.id !== id));
      } else {
        await requestJson("/api/notifications", "PATCH", action === "all" ? { readAll: true } : { id });
        setNotifications((current) => current.map((item) => action === "all" || item.id === id ? { ...item, unread: false } : item));
      }
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật thông báo.");
    }
  }

  function toggleOrder(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function togglePageSelection() {
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !pageOrderIds.includes(id))
      : [...new Set([...current, ...pageOrderIds])]);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleTheme() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);
    window.localStorage.setItem("chathub-theme", nextMode ? "dark" : "light");
  }

  return (
    <main className={`flex h-[100dvh] flex-col overflow-hidden text-[#202638] ${darkMode ? "bg-[#111827]" : "bg-[#F5F6FA]"}`}>
      <header className="z-50 flex h-[60px] shrink-0 items-center justify-between bg-[#131722] px-4 text-white sm:px-6">
        <div className="flex w-1/3 items-center">
          <button type="button" aria-label={drawerOpen ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={drawerOpen} onClick={() => setDrawerOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10 lg:hidden">
            {drawerOpen ? <X className="h-[21px] w-[21px]" /> : <Menu className="h-[21px] w-[21px]" />}
          </button>
          <span className="ml-2 hidden text-sm font-bold tracking-wide lg:inline">{String(settings.general?.systemName ?? "ChatHub")}</span>
        </div>
        <h1 className="w-1/3 text-center text-[17px] font-bold tracking-wide">Đơn hàng</h1>
        <div className="flex w-1/3 items-center justify-end gap-1">
          <button type="button" aria-label="Tìm đơn hàng" onClick={() => searchRef.current?.focus()} className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10"><Search className="h-5 w-5" /></button>
          <button type="button" aria-label={`Thông báo, ${notificationUnreadCount} chưa đọc`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10">
            <Bell className="h-5 w-5" />
            {notificationUnreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#131722] bg-[#F04452] px-1 text-[9px] font-bold">{notificationUnreadCount}</span>}
          </button>
        </div>
      </header>

      <TopbarNavigation />
      <div className="flex min-h-0 flex-1">
        <MainNavigation activePath="/orders" darkMode={darkMode} receivingEnabled={receivingEnabled} onToggleDarkMode={toggleTheme} onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)} />
        <section className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Tổng đơn hàng" value={stats.total} icon={<Inbox className="h-5 w-5" />} tone="blue" className="col-span-2" />
              <StatCard label="Chờ xử lý" value={stats.pending} icon={<MoreHorizontal className="h-5 w-5" />} tone="amber" />
              <StatCard label="Đang xử lý" value={stats.processing} icon={<PackageCheck className="h-5 w-5" />} tone="sky" />
              <StatCard label="Đã giao" value={stats.delivered} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
              <StatCard label="Đã huỷ" value={stats.cancelled} icon={<Archive className="h-5 w-5" />} tone="rose" />
            </div>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[20px] font-bold tracking-tight text-[#252C3B]">Danh sách đơn hàng</h2>
                <button type="button" aria-label="Làm mới danh sách đơn hàng" onClick={() => setRefreshKey((key) => key + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E8EAF0] bg-white text-slate-500 transition hover:bg-slate-50 hover:text-[#2B54C3] disabled:opacity-50">
                  <RefreshCw className={`h-[17px] w-[17px] ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#E8EAF0] bg-white px-3 text-slate-400 focus-within:ring-2 focus-within:ring-[#2B54C3]/20">
                  <Search className="h-[17px] w-[17px] shrink-0" />
                  <input ref={searchRef} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm đơn hàng..." className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" />
                </label>
                <div className="relative">
                  <button type="button" aria-label="Bộ lọc đơn hàng" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8EAF0] bg-white text-slate-500 hover:bg-slate-50"><SlidersHorizontal className="h-[18px] w-[18px]" /></button>
                  {filterOpen && <div className="absolute right-0 top-12 z-30 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{statusOptions.map((option) => (
                    <button type="button" key={option.value} onClick={() => { setStatusFilter(option.value); setPage(1); setFilterOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs ${statusFilter === option.value ? "bg-[#EEF2FC] font-semibold text-[#2B54C3]" : "text-slate-600 hover:bg-slate-50"}`}>{option.label}{statusFilter === option.value && <Check className="h-4 w-4" />}</button>
                  ))}</div>}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 px-1">
                <input type="checkbox" aria-label="Chọn tất cả đơn hàng trên trang" checked={allVisibleSelected} onChange={togglePageSelection} className="h-4 w-4 rounded border-slate-300 accent-[#2B54C3]" />
                <span className="text-[11px] font-medium text-[#565E6D]">Chọn cả tổng</span>
                <span className="text-[10px] text-[#9298A5]">({pagination.total} đơn hàng)</span>
                {selectedIds.length > 0 && <span className="ml-auto text-[10px] font-medium text-[#2B54C3]">Đã chọn {selectedIds.length}</span>}
              </div>

              <div className="mt-3 space-y-3">
                {orders.length ? orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currencyUnit={currencyUnit}
                    selected={selectedIds.includes(order.id)}
                    expanded={expandedIds.includes(order.id)}
                    saving={saving}
                    onSelect={() => toggleOrder(order.id)}
                    onToggleDetails={() => toggleExpanded(order.id)}
                    onDeliver={() => void applyOrderAction(order, "deliver")}
                    onEdit={() => setEditingOrder(order)}
                    onChat={() => void openCustomerChat(order)}
                  />
                )) : (
                  <div className="rounded-2xl border border-[#E8EAF0] bg-white px-6 py-12 text-center text-sm text-slate-500">{loading ? "Đang tải đơn hàng..." : "Không tìm thấy đơn hàng phù hợp."}</div>
                )}
              </div>

              <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8EAF0] bg-white px-3 py-3 text-[11px] text-slate-500 sm:px-4">
                <span>{pagination.total ? `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} trong ${pagination.total}` : "0–0 trong 0"}</span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Trang trước" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-[58px] text-center">Trang {pagination.page}/{pagination.pageCount}</span>
                  <button type="button" disabled={page >= pagination.pageCount || loading} onClick={() => setPage((current) => Math.min(pagination.pageCount, current + 1))} aria-label="Trang sau" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                  <select aria-label="Số đơn hàng mỗi trang" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-600 outline-none">
                    {[10, 20, 50].map((size) => <option key={size} value={size}>{size} / trang</option>)}
                  </select>
                </div>
              </footer>
            </section>
          </div>
        </section>
      </div>

      <BottomNavigation activePath="/orders" />

      {editingOrder && <EditOrderModal order={editingOrder} currencyUnit={currencyUnit} saving={saving} onClose={() => setEditingOrder(null)} onSave={saveOrderNote} onCancel={() => void applyOrderAction(editingOrder, "cancel")} />}
      {notice && <div role="status" className="fixed bottom-[82px] left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-[#202638] px-4 py-2.5 text-xs font-medium text-white shadow-lg md:bottom-6">{notice}</div>}
      <NotificationDrawer
        open={notificationsOpen}
        notifications={notifications}
        unreadCount={notificationUnreadCount}
        onClose={() => setNotificationsOpen(false)}
        onReadAll={() => void updateNotification("", "all")}
        onRead={(id) => void updateNotification(id, "read")}
        onDelete={(id) => void updateNotification(id, "delete")}
      />
      <MainNavigation
        mobile
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activePath="/orders"
        darkMode={darkMode}
        receivingEnabled={receivingEnabled}
        onToggleDarkMode={toggleTheme}
        onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)}
      />
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  className = "",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "amber" | "sky" | "green" | "rose";
  className?: string;
}) {
  const toneClasses = {
    blue: "bg-[#EEF2FC] text-[#2B54C3]",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    green: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <article className={`flex min-h-[76px] items-center gap-3 rounded-2xl border border-[#E8EAF0] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:px-5 ${className}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>{icon}</span>
      <div><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold tracking-tight text-[#252C3B]">{value}</p></div>
    </article>
  );
}

function OrderCard({
  order,
  currencyUnit,
  selected,
  expanded,
  saving,
  onSelect,
  onToggleDetails,
  onDeliver,
  onEdit,
  onChat,
}: {
  order: Order;
  currencyUnit: string;
  selected: boolean;
  expanded: boolean;
  saving: boolean;
  onSelect: () => void;
  onToggleDetails: () => void;
  onDeliver: () => void;
  onEdit: () => void;
  onChat: () => void;
}) {
  const status = statusDetails[order.status];
  const canDeliver = order.status === "pending" || order.status === "processing";
  return (
    <article className={`rounded-2xl border bg-white shadow-[0_1px_3px_rgba(16,24,40,0.03)] transition ${selected ? "border-[#2B54C3]/50 ring-2 ring-[#2B54C3]/10" : "border-[#E8EAF0]"}`}>
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <input type="checkbox" aria-label={`Chọn đơn ${order.code}`} checked={selected} onChange={onSelect} className="mt-1 h-4 w-4 shrink-0 accent-[#2B54C3]" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] font-bold text-[#272E3D]">{order.productName}</h3>
              <span className="rounded-md bg-[#EEF2FC] px-2 py-0.5 text-[10px] font-bold text-[#2B54C3]">x{order.quantity}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
              <code className="rounded bg-slate-50 px-1.5 py-0.5 font-semibold text-slate-700">{order.code}</code>
              <span>{order.category}</span><span className="hidden text-slate-300 sm:inline">·</span><span>{order.workflow}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-[#4B5362]">{order.customerName}</span>
              <time className="text-slate-400">{formatDate(order.placedAt)}</time>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-[#252C3B]">{formatCredits(order.total, currencyUnit)}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status.className}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button type="button" onClick={onToggleDetails} aria-expanded={expanded} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Chi tiết <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`} /></button>
          <button type="button" disabled={!canDeliver || saving} onClick={onDeliver} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2B54C3] px-3 text-[11px] font-semibold text-white transition hover:bg-[#2448A8] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:flex-none"><Check className="h-4 w-4" />{order.status === "delivered" ? "Đã giao" : order.status === "cancelled" ? "Đã huỷ" : "Duyệt & giao"}</button>
          <button type="button" aria-label="Sửa đơn hàng" onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#2B54C3]"><Pencil className="h-4 w-4" /></button>
          <button type="button" aria-label={`Nhắn tin cho ${order.customerName}`} onClick={onChat} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#2B54C3]"><MessageSquare className="h-4 w-4" /></button>
        </div>
      </div>

      {expanded && <div className="grid gap-4 border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div><h4 className="text-[11px] font-bold text-slate-700">Thông tin đặt hàng</h4><p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-5 text-slate-500">{order.note || "Chưa có ghi chú bổ sung."}</p></div>
        <div><h4 className="text-[11px] font-bold text-slate-700">Thông tin xử lý</h4><dl className="mt-1.5 space-y-1 text-[11px]"><div className="flex gap-2"><dt className="text-slate-400">Mã đơn:</dt><dd className="font-mono text-slate-600">{order.processingCode}</dd></div><div className="flex gap-2"><dt className="text-slate-400">Kiểu giao hàng:</dt><dd className="text-slate-600">{order.deliveryType}</dd></div></dl></div>
        <div className="flex justify-end sm:col-span-2"><button type="button" onClick={onEdit} className="rounded-lg bg-slate-200/80 px-3 py-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-200">Sửa đơn</button></div>
      </div>}
    </article>
  );
}

function EditOrderModal({
  order,
  currencyUnit,
  saving,
  onClose,
  onSave,
  onCancel,
}: {
  order: Order;
  currencyUnit: string;
  saving: boolean;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] = useState(order.note);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-5 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="edit-order-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><h2 id="edit-order-title" className="text-[17px] font-bold text-slate-800">Sửa đơn hàng</h2><p className="mt-1.5 text-[11px] leading-5 text-slate-500">Đơn {order.code} · {order.productName}. Sửa ở đây không đổi số lượng, giá hay trạng thái của đơn.</p></div>
          <button type="button" aria-label="Đóng" onClick={onClose} disabled={saving} className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div><h3 className="text-[12px] font-bold text-slate-700">Thông tin đặt hàng</h3><div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-[11px] text-slate-600"><div className="flex justify-between gap-3"><span>Sản phẩm</span><span className="text-right font-semibold">{order.productName} × {order.quantity}</span></div><div className="mt-2 flex justify-between gap-3"><span>Khách hàng</span><span className="font-semibold">{order.customerName}</span></div><div className="mt-2 flex justify-between gap-3"><span>Tổng tiền</span><span className="font-semibold">{formatCredits(order.total, currencyUnit)}</span></div></div></div>
          <label className="block"><span className="text-[12px] font-bold text-slate-700">Ghi chú nội bộ</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={4000} placeholder="Nhập ghi chú nội bộ..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] text-slate-700 outline-none focus:border-[#2B54C3] focus:ring-2 focus:ring-[#2B54C3]/10" /><span className="mt-1.5 block text-[10px] text-slate-400">Chỉ người trong shop đọc được; khách không thấy ghi chú này.</span></label>
          <section className="rounded-xl border border-rose-200 bg-white p-4"><h3 className="text-[12px] font-bold text-slate-700">Huỷ đơn</h3><p className="mt-1.5 text-[10px] leading-5 text-slate-500">Huỷ đơn sẽ hoàn tiền vào ví khách và trả những mã chưa gửi về kho.</p><button type="button" disabled={saving || order.status === "delivered" || order.status === "cancelled"} onClick={onCancel} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-300 px-3 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><X className="h-4 w-4" />Huỷ</button></section>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Đóng</button><button type="button" disabled={saving} onClick={() => void onSave(note)} className="rounded-xl bg-[#2B54C3] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2448A8] disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></footer>
      </section>
    </div>
  );
}
