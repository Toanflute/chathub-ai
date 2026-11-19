"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Menu,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MainNavigation from "@/components/main-navigation";
import NotificationDrawer, { type NotificationItem } from "@/components/notification-drawer";
import SearchCommandPalette from "@/components/search-command-palette";
import TopbarNavigation from "@/components/topbar-navigation";
import { useSettings } from "@/context/SettingsContext";
import {
  appointmentServices,
  appointmentSlots,
  appointmentStaff,
  type AppointmentStatus,
} from "@/lib/appointment-config";

type ViewMode = "day" | "week" | "month";
type CalendarAppointment = {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerInitials: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  assignedTo: string;
  status: AppointmentStatus;
  note: string;
};
type Customer = { id: string; name: string; phone: string | null; initials: string };
type AgentDraft = {
  action: "create" | "reschedule";
  appointmentId?: string;
  customerId: string;
  serviceName: string;
  assignedTo: string;
  startsAt: string;
  note: string;
};
type AgentMessage = { role: "user" | "assistant"; content: string; draft?: AgentDraft | null };
type AppointmentFormValues = {
  customerId: string;
  serviceName: string;
  assignedTo: string;
  date: string;
  time: string;
  note: string;
};

const statusNames: Record<AppointmentStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Đã kết thúc",
  cancelled: "Đã huỷ",
};

const statusStyles: Record<AppointmentStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-rose-50 text-rose-700",
};

const weekDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function visibleRange(date: Date, mode: ViewMode) {
  if (mode === "day") {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return { start, end: addDays(start, 1) };
  }
  if (mode === "week") {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 7) };
  }
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return { start, end: new Date(date.getFullYear(), date.getMonth() + 1, 1) };
}

function daysForView(date: Date, mode: ViewMode) {
  if (mode === "day") return [new Date(date.getFullYear(), date.getMonth(), date.getDate())];
  if (mode === "week") return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index + 1));
}

function rangeLabel(date: Date, mode: ViewMode) {
  if (mode === "day") return `ngày ${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  if (mode === "month") return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${end.getDate()} tháng ${end.getMonth() + 1}, ${end.getFullYear()}`;
  return `${start.getDate()}/${start.getMonth() + 1} – ${end.getDate()}/${end.getMonth() + 1}, ${end.getFullYear()}`;
}

function dateInputValue(iso: string) {
  return localDateKey(new Date(iso));
}

function timeInputValue(iso: string) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(value: string) {
  return fromDateKey(value).toLocaleDateString("vi-VN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AppointmentsPage() {
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [staffFilter, setStaffFilter] = useState("all");
  const [includeEnded, setIncludeEnded] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<CalendarAppointment | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<AppointmentFormValues | undefined>();
  const [formDefaultDate, setFormDefaultDate] = useState<Date>(() => new Date());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [receivingEnabled, setReceivingEnabled] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState("");

  const range = visibleRange(selectedDate, viewMode);
  const rangeStartIso = range.start.toISOString();
  const rangeEndIso = range.end.toISOString();
  const days = daysForView(selectedDate, viewMode);
  const selectedDateKey = localDateKey(selectedDate);
  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const selectedDayAppointments = useMemo(() => appointments
    .filter((appointment) => dateInputValue(appointment.startsAt) === selectedDateKey)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [appointments, selectedDateKey]);

  useEffect(() => {
    let active = true;
    async function loadCalendar() {
      setLoading(true);
      try {
        const parameters = new URLSearchParams({
          start: rangeStartIso,
          end: rangeEndIso,
          staff: staffFilter,
          includeEnded: String(includeEnded),
        });
        const [calendarResponse, contactsResponse, notificationResponse] = await Promise.all([
          fetch(`/api/appointments?${parameters.toString()}`),
          fetch("/api/contacts"),
          fetch("/api/notifications"),
        ]);
        const [calendarData, contactsData, notificationData] = await Promise.all([
          calendarResponse.json(),
          contactsResponse.json(),
          notificationResponse.json(),
        ]);
        if (!calendarResponse.ok || !contactsResponse.ok || !notificationResponse.ok) {
          throw new Error(calendarData.error ?? contactsData.error ?? notificationData.error ?? "Không thể tải lịch.");
        }
        if (!active) return;
        setAppointments(calendarData.appointments);
        setStats(calendarData.stats);
        setCustomers(contactsData.contacts.map((contact: Customer) => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone ?? null,
          initials: contact.initials,
        })));
        setNotifications(notificationData.notifications);
      } catch (error) {
        if (active) showNotice(error instanceof Error ? error.message : "Không thể tải lịch hẹn.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCalendar();
    return () => { active = false; };
  }, [includeEnded, rangeEndIso, rangeStartIso, refreshKey, staffFilter]);

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

  function shiftPeriod(direction: -1 | 1) {
    const next = new Date(selectedDate);
    if (viewMode === "day") next.setDate(next.getDate() + direction);
    else if (viewMode === "week") next.setDate(next.getDate() + direction * 7);
    else {
      const dayOfMonth = next.getDate();
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
      next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
    }
    setSelectedDate(next);
  }

  function openBooking(date = selectedDate, initial?: AppointmentFormValues, appointment: CalendarAppointment | null = null) {
    setFormDefaultDate(date);
    setInitialFormValues(initial);
    setEditingAppointment(appointment);
    setBookingOpen(true);
  }

  async function saveAppointment(values: AppointmentFormValues) {
    setSaving(true);
    try {
      const service = appointmentServices.find((item) => item.name === values.serviceName);
      if (!service) throw new Error("Dịch vụ không hợp lệ.");
      const startsAt = new Date(`${values.date}T${values.time}:00`).toISOString();
      const payload = {
        customerId: values.customerId,
        serviceName: values.serviceName,
        assignedTo: values.assignedTo,
        startsAt,
        note: values.note,
      };
      if (editingAppointment) await requestJson(`/api/appointments/${editingAppointment.id}`, "PATCH", payload);
      else await requestJson("/api/appointments", "POST", payload);
      setBookingOpen(false);
      setAgentOpen(false);
      setRefreshKey((key) => key + 1);
      showNotice(editingAppointment ? "Đã cập nhật lịch hẹn." : "Đã đặt lịch hẹn.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể lưu lịch hẹn.");
    } finally {
      setSaving(false);
    }
  }

  async function updateAppointmentStatus(appointment: CalendarAppointment, status: AppointmentStatus) {
    try {
      await requestJson(`/api/appointments/${appointment.id}`, "PATCH", { status });
      setRefreshKey((key) => key + 1);
      showNotice(status === "confirmed" ? "Đã xác nhận lịch hẹn." : status === "cancelled" ? "Đã huỷ lịch hẹn." : "Đã cập nhật lịch hẹn.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật lịch hẹn.");
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

  async function sendAgentMessage(text = agentInput) {
    const message = text.trim();
    if (!message || agentLoading) return;
    if (agentMessages.filter((item) => item.role === "user").length >= 20) {
      setAgentError("Đã đạt giới hạn 20 lượt. Hãy bắt đầu cuộc trò chuyện mới.");
      return;
    }
    const priorMessages = agentMessages.map(({ role, content }) => ({ role, content }));
    setAgentMessages((current) => [...current, { role: "user", content: message }]);
    setAgentInput("");
    setAgentError("");
    setAgentLoading(true);
    try {
      const result = await requestJson("/api/appointments/agent", "POST", {
        message,
        history: priorMessages,
        rangeStart: range.start.toISOString(),
        rangeEnd: range.end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setAgentMessages((current) => [...current, { role: "assistant", content: result.answer, draft: result.draft }]);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "AI Agent không thể trả lời.");
    } finally {
      setAgentLoading(false);
    }
  }

  function applyAgentDraft(draft: AgentDraft) {
    const appointment = draft.action === "reschedule"
      ? appointments.find((item) => item.id === draft.appointmentId) ?? null
      : null;
    const values: AppointmentFormValues = {
      customerId: draft.customerId || appointment?.customerId || "",
      serviceName: draft.serviceName || appointment?.serviceName || appointmentServices[0].name,
      assignedTo: draft.assignedTo || appointment?.assignedTo || appointmentStaff[0],
      date: dateInputValue(draft.startsAt),
      time: timeInputValue(draft.startsAt),
      note: draft.note || appointment?.note || "",
    };
    openBooking(fromDateKey(values.date), values, appointment);
  }

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("chathub-theme", next ? "dark" : "light");
  }

  const todayKey = localDateKey(new Date());
  const agentTurnCount = agentMessages.filter((message) => message.role === "user").length;

  return (
    <main className={`flex h-[100dvh] flex-col overflow-hidden text-[#202638] ${darkMode ? "bg-[#111827]" : "bg-[#F5F6FA]"}`}>
      <header className="z-50 flex h-[60px] shrink-0 items-center justify-between bg-[#131722] px-4 text-white sm:px-6">
        <div className="flex w-1/3 items-center">
          <button type="button" aria-label={drawerOpen ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={drawerOpen} onClick={() => setDrawerOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10 lg:hidden">{drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <span className="ml-2 hidden text-sm font-bold tracking-wide lg:inline">{String(settings.general?.systemName ?? "ChatHub")}</span>
        </div>
        <h1 className="w-1/3 text-center text-[17px] font-bold tracking-wide">Lịch hẹn</h1>
        <div className="flex w-1/3 items-center justify-end gap-1">
          <button type="button" aria-label="Tìm kiếm nhanh" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10"><Search className="h-5 w-5" /></button>
          <button type="button" aria-label={`Thông báo, ${unreadCount} chưa đọc`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)} className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10"><Bell className="h-5 w-5" />{unreadCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#131722] bg-[#F04452] px-1 text-[9px] font-bold">{unreadCount}</span>}</button>
        </div>
      </header>

      <div className="flex min-h-[38px] shrink-0 items-center justify-center gap-2 border-b border-[#E8D6B2] bg-[#FDF6E7] px-3 py-2 text-center text-[11px] font-medium text-[#765D39] sm:text-xs"><Eye className="h-4 w-4 shrink-0" /><span>Bản demo — bạn xem được mọi thứ nhưng không thêm, sửa hay xoá dữ liệu.</span></div>

      <TopbarNavigation />
      <div className="flex min-h-0 flex-1">
        <MainNavigation activePath="/appointments" darkMode={darkMode} receivingEnabled={receivingEnabled} onToggleDarkMode={toggleTheme} onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)} />
        <section className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[22px] font-bold tracking-tight text-[#252C3B]">Lịch hẹn</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setAgentOpen(true); setAgentError(""); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E1E5ED] bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><Sparkles className="h-4 w-4 text-[#7C65D8]" />Hỏi AI Agent</button>
                <button type="button" onClick={() => openBooking(selectedDate)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#2B54C3] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2448A8]"><Plus className="h-4 w-4" />Đặt lịch</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatsCard label="Tổng lịch" count={stats.total} tone="blue" icon={<CalendarDays className="h-4 w-4" />} />
              <StatsCard label="Chờ xác nhận" count={stats.pending} tone="amber" icon={<Clock3 className="h-4 w-4" />} />
              <StatsCard label="Đã xác nhận" count={stats.confirmed} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
            </div>

            <section className="mt-5 overflow-hidden rounded-2xl border border-[#E8EAF0] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.03)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <button type="button" aria-label="Khoảng thời gian trước" onClick={() => shiftPeriod(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setSelectedDate(new Date())} className="h-8 rounded-lg border border-slate-200 px-3 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Hôm nay</button>
                  <button type="button" aria-label="Khoảng thời gian sau" onClick={() => shiftPeriod(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
                  <h3 className="ml-1 truncate text-[12px] font-bold text-slate-800 sm:text-sm">{rangeLabel(selectedDate, viewMode)}</h3>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                  {(["day", "week", "month"] as const).map((mode) => <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition sm:px-3 ${viewMode === mode ? "bg-white text-[#2B54C3] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{mode === "day" ? "Ngày" : mode === "week" ? "Tuần" : "Tháng"}</button>)}
                  <button type="button" aria-label="Tuỳ chọn bộ lọc" aria-expanded={filtersVisible} onClick={() => setFiltersVisible((visible) => !visible)} className={`ml-1 flex h-7 w-7 items-center justify-center rounded-lg ${filtersVisible ? "bg-white text-[#2B54C3]" : "text-slate-500"}`}><SlidersHorizontal className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {filtersVisible && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                <label className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><span>Chọn ngày</span><input id="appointment-date-filter" type="date" value={selectedDateKey} onChange={(event) => event.target.value && setSelectedDate(fromDateKey(event.target.value))} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-600 outline-none focus:border-[#2B54C3]" /></label>
                <label className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><span>Người phụ trách</span><select value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-600 outline-none focus:border-[#2B54C3]"><option value="all">Tất cả nhân viên</option>{appointmentStaff.map((staff) => <option key={staff} value={staff}>{staff}</option>)}</select></label>
                <label className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><input type="checkbox" checked={includeEnded} onChange={(event) => setIncludeEnded(event.target.checked)} className="h-3.5 w-3.5 accent-[#2B54C3]" />Hiện lịch đã kết thúc</label>
              </div>}

              {viewMode === "month" ? (
                <MonthGrid days={days} selectedDateKey={selectedDateKey} todayKey={todayKey} appointments={appointments} onSelect={(day) => { setSelectedDate(day); setViewMode("day"); }} />
              ) : (
                <div className={`grid divide-x divide-slate-100 ${viewMode === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
                  {days.map((day, index) => {
                    const key = localDateKey(day);
                    const selected = key === selectedDateKey;
                    const count = appointments.filter((appointment) => dateInputValue(appointment.startsAt) === key).length;
                    return <button key={key} type="button" onClick={() => setSelectedDate(day)} className={`min-w-0 px-1 py-3 text-center transition hover:bg-slate-50 sm:px-2 ${selected ? "bg-[#F1F5FF]" : ""}`}>
                      <span className="block truncate text-[8px] font-medium text-slate-400 sm:text-[10px]">{weekDays[viewMode === "day" ? (day.getDay() + 6) % 7 : index]}</span>
                      <span className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold sm:h-8 sm:w-8 sm:text-xs ${selected ? "bg-[#2B54C3] text-white" : key === todayKey ? "text-[#2B54C3]" : "text-slate-700"}`}>{day.getDate()}</span>
                      {key === todayKey && <span className="mt-0.5 block text-[7px] font-semibold text-[#2B54C3] sm:text-[8px]">Hôm nay</span>}
                      <span className="mt-1 block text-[8px] text-slate-400">{count || ""}</span>
                    </button>;
                  })}
                </div>
              )}

              <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div><h3 className="text-[13px] font-bold text-slate-800">Lịch ngày {selectedDate.getDate()}</h3><p className="mt-0.5 text-[10px] text-slate-400">{formatDateLabel(selectedDateKey)}</p></div>
                  <button type="button" aria-label="Thêm lịch hẹn vào ngày này" onClick={() => openBooking(selectedDate)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-[#2B54C3] hover:bg-[#F1F5FF]"><Plus className="h-4 w-4" /></button>
                </div>
                {loading ? <p className="py-8 text-center text-xs text-slate-400">Đang tải lịch hẹn...</p> : selectedDayAppointments.length ? (
                  <div className="mt-3 space-y-2.5">{selectedDayAppointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onConfirm={() => void updateAppointmentStatus(appointment, "confirmed")} onComplete={() => void updateAppointmentStatus(appointment, "completed")} onCancel={() => {
                    if (window.confirm("Huỷ lịch hẹn này?")) void updateAppointmentStatus(appointment, "cancelled");
                  }} />)}</div>
                ) : <div className="py-9 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CalendarDays className="h-5 w-5" /></div><p className="mt-2 text-[12px] font-semibold text-slate-600">0 cuộc hẹn</p><p className="mt-1 text-[10px] text-slate-400">Ngày này chưa có lịch hẹn.</p></div>}
              </div>
            </section>
          </div>
        </section>
      </div>

      <BottomNavigation activePath="/appointments" />
      {bookingOpen && <AppointmentForm
        key={`${editingAppointment?.id ?? "new"}-${initialFormValues?.date ?? selectedDateKey}`}
        customers={customers}
        appointments={appointments}
        initialValues={initialFormValues}
        defaultDate={formDefaultDate}
        editing={editingAppointment}
        saving={saving}
        onClose={() => { setBookingOpen(false); setEditingAppointment(null); setInitialFormValues(undefined); }}
        onSave={saveAppointment}
      />}
      {agentOpen && <AgentModal
        messages={agentMessages}
        input={agentInput}
        loading={agentLoading}
        error={agentError}
        turns={agentTurnCount}
        rangeText={rangeLabel(selectedDate, viewMode)}
        onClose={() => setAgentOpen(false)}
        onInput={setAgentInput}
        onSend={(message) => void sendAgentMessage(message)}
        onNewChat={() => { setAgentMessages([]); setAgentInput(""); setAgentError(""); }}
        onApplyDraft={applyAgentDraft}
      />}
      {notice && <div role="status" className="fixed bottom-[82px] left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-[#202638] px-4 py-2.5 text-xs font-medium text-white shadow-lg md:bottom-6">{notice}</div>}
      <NotificationDrawer open={notificationsOpen} notifications={notifications} unreadCount={unreadCount} onClose={() => setNotificationsOpen(false)} onReadAll={() => void updateNotification("", "all")} onRead={(id) => void updateNotification(id, "read")} onDelete={(id) => void updateNotification(id, "delete")} />
      <SearchCommandPalette open={searchOpen} contacts={customers} conversations={[]} onClose={() => setSearchOpen(false)} onOpenConversation={() => window.location.assign("/inbox")} />
      <MainNavigation mobile open={drawerOpen} onClose={() => setDrawerOpen(false)} activePath="/appointments" darkMode={darkMode} receivingEnabled={receivingEnabled} onToggleDarkMode={toggleTheme} onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)} />
    </main>
  );
}

function StatsCard({ label, count, tone, icon }: { label: string; count: number; tone: "blue" | "amber" | "green"; icon: React.ReactNode }) {
  const colors = { blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", green: "bg-emerald-50 text-emerald-600" };
  return <article className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#E8EAF0] bg-white px-3 py-3 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:gap-3 sm:px-4"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors[tone]}`}>{icon}</span><div className="min-w-0"><p className="truncate text-[9px] font-medium text-slate-500 sm:text-[10px]">{label}</p><p className="mt-0.5 text-lg font-bold leading-5 text-[#252C3B]">{count}</p></div></article>;
}

function MonthGrid({ days, selectedDateKey, todayKey, appointments, onSelect }: { days: Date[]; selectedDateKey: string; todayKey: string; appointments: CalendarAppointment[]; onSelect: (date: Date) => void }) {
  const firstDay = new Date(days[0].getFullYear(), days[0].getMonth(), 1);
  const offset = (firstDay.getDay() + 6) % 7;
  return <div className="p-3 sm:p-4">
    <div className="grid grid-cols-7 gap-1">{weekDays.map((day) => <span key={day} className="py-2 text-center text-[9px] font-semibold text-slate-400">{day.slice(0, 3)}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
      {days.map((day) => {
        const key = localDateKey(day);
        const count = appointments.filter((appointment) => dateInputValue(appointment.startsAt) === key).length;
        const active = selectedDateKey === key;
        return <button key={key} type="button" onClick={() => onSelect(day)} className={`flex min-h-[44px] flex-col items-center justify-center rounded-lg text-[10px] transition hover:bg-slate-50 ${active ? "bg-[#2B54C3] font-bold text-white hover:bg-[#2448A8]" : key === todayKey ? "font-bold text-[#2B54C3]" : "text-slate-600"}`}><span>{day.getDate()}</span>{count > 0 && <span className={`mt-0.5 h-1 w-1 rounded-full ${active ? "bg-white" : "bg-[#2B54C3]"}`} />}</button>;
      })}
    </div>
  </div>;
}

function AppointmentCard({ appointment, onConfirm, onComplete, onCancel }: { appointment: CalendarAppointment; onConfirm: () => void; onComplete: () => void; onCancel: () => void }) {
  const status = appointment.status;
  return <article className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex w-[58px] shrink-0 flex-col text-right"><span className="text-[12px] font-bold text-slate-700">{formatTime(appointment.startsAt)}</span><span className="mt-0.5 text-[9px] text-slate-400">{appointment.durationMinutes} phút</span></div>
    <div className="h-10 w-1 shrink-0 rounded-full bg-[#2B54C3]" />
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-[12px] font-bold text-slate-800">{appointment.customerName}</h4><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusStyles[status]}`}>{statusNames[status]}</span></div><p className="mt-1 text-[10px] text-slate-500">{appointment.serviceName} · {appointment.assignedTo}</p>{appointment.note && <p className="mt-1 truncate text-[10px] text-slate-400">{appointment.note}</p>}</div>
    <div className="flex items-center gap-1.5">
      {status === "pending" && <button type="button" onClick={onConfirm} className="rounded-lg bg-emerald-50 px-2.5 py-2 text-[9px] font-semibold text-emerald-700 hover:bg-emerald-100">Xác nhận</button>}
      {status === "confirmed" && <button type="button" onClick={onComplete} className="rounded-lg bg-slate-100 px-2.5 py-2 text-[9px] font-semibold text-slate-600 hover:bg-slate-200">Hoàn thành</button>}
      {(status === "pending" || status === "confirmed") && <button type="button" onClick={onCancel} aria-label="Huỷ lịch hẹn" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"><X className="h-4 w-4" /></button>}
    </div>
  </article>;
}

function AppointmentForm({
  customers,
  appointments,
  initialValues,
  defaultDate,
  editing,
  saving,
  onClose,
  onSave,
}: {
  customers: Customer[];
  appointments: CalendarAppointment[];
  initialValues?: AppointmentFormValues;
  defaultDate: Date;
  editing: CalendarAppointment | null;
  saving: boolean;
  onClose: () => void;
  onSave: (values: AppointmentFormValues) => Promise<void>;
}) {
  const [date, setDate] = useState(initialValues?.date ?? localDateKey(defaultDate));
  const [time, setTime] = useState(initialValues?.time ?? "");
  const [customerId, setCustomerId] = useState(initialValues?.customerId ?? editing?.customerId ?? "");
  const [customerQuery, setCustomerQuery] = useState("");
  const [serviceName, setServiceName] = useState(initialValues?.serviceName ?? editing?.serviceName ?? appointmentServices[0].name);
  const [assignedTo, setAssignedTo] = useState(initialValues?.assignedTo ?? editing?.assignedTo ?? appointmentStaff[0]);
  const [note, setNote] = useState(initialValues?.note ?? editing?.note ?? "");
  const duration = appointmentServices.find((service) => service.name === serviceName)?.durationMinutes ?? 60;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const suggestions = customerQuery.trim().length >= 2 ? customers.filter((customer) => `${customer.name} ${customer.phone ?? ""}`.toLocaleLowerCase("vi").includes(customerQuery.trim().toLocaleLowerCase("vi"))).slice(0, 6) : [];
  const availableSlots = appointmentSlots.filter((slot) => {
    const start = new Date(`${date}T${slot}:00`);
    const end = new Date(start.getTime() + duration * 60_000);
    if (date === localDateKey(new Date()) && start <= new Date()) return false;
    return !appointments.some((appointment) => {
      if (appointment.id === editing?.id || appointment.status === "cancelled" || appointment.status === "completed") return false;
      if (assignedTo !== "Ai cũng được" && appointment.assignedTo !== "Ai cũng được" && appointment.assignedTo !== assignedTo) return false;
      return start < new Date(appointment.endsAt) && end > new Date(appointment.startsAt);
    });
  });

  useEffect(() => {
    if (time && !availableSlots.includes(time as (typeof appointmentSlots)[number])) setTime("");
  }, [availableSlots, time]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId || !time) return;
    void onSave({ customerId, serviceName, assignedTo, date, time, note });
  }

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <form onSubmit={submit} className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div><h2 className="text-[17px] font-bold text-slate-800">{editing ? "Dời lịch hẹn" : "Đặt lịch hẹn"}</h2><p className="mt-1 text-[11px] text-slate-500">Chọn khách hàng, sau đó chọn một khung giờ khả dụng.</p></div><button type="button" aria-label="Đóng" onClick={onClose} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
      <div className="space-y-5 px-5 py-5 sm:px-6">
        <section><h3 className="text-[12px] font-bold text-slate-700">Khách hàng & dịch vụ</h3>
          <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Tìm khách</span><div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-slate-400"><Search className="h-4 w-4" /><input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Nhập ít nhất 2 ký tự để tìm khách hàng" className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" /></div></label>
          {customerQuery.trim().length > 0 && customerQuery.trim().length < 2 && <p className="mt-1 text-[10px] text-slate-400">Nhập ít nhất 2 ký tự để tìm khách hàng.</p>}
          {suggestions.length > 0 && <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">{suggestions.map((customer) => <button type="button" key={customer.id} onClick={() => { setCustomerId(customer.id); setCustomerQuery(customer.name); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50"><span className="font-semibold text-slate-700">{customer.name}</span><span className="text-slate-400">{customer.phone}</span></button>)}</div>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Khách</span><select required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#2B54C3]"><option value="">Chọn khách hàng</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Dịch vụ</span><select value={serviceName} onChange={(event) => setServiceName(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#2B54C3]">{appointmentServices.map((service) => <option key={service.name} value={service.name}>{service.name} · {service.durationMinutes} phút</option>)}</select></label>
          </div>
          {selectedCustomer && <p className="mt-2 text-[10px] text-slate-400">Đã chọn: {selectedCustomer.name}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</p>}
        </section>
        <section><h3 className="text-[12px] font-bold text-slate-700">Thời gian & người phụ trách</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Người phụ trách</span><select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#2B54C3]">{appointmentStaff.map((staff) => <option key={staff} value={staff}>{staff}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Ngày hẹn</span><input type="date" value={date} onChange={(event) => { setDate(event.target.value); setTime(""); }} required className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#2B54C3]" /></label>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-slate-600">Khung giờ khả dụng <span className="font-normal text-slate-400">({duration} phút)</span></p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{appointmentSlots.map((slot) => {
            const available = availableSlots.includes(slot);
            return <button key={slot} type="button" disabled={!available} onClick={() => setTime(slot)} className={`h-9 rounded-lg border text-[11px] font-semibold transition ${time === slot ? "border-[#2B54C3] bg-[#EEF2FC] text-[#2B54C3]" : available ? "border-slate-200 text-slate-600 hover:border-[#2B54C3] hover:text-[#2B54C3]" : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"}`}>{slot}</button>;
          })}</div>
          {!availableSlots.length && <p className="mt-2 text-[10px] text-amber-600">Ngày này không còn khung giờ phù hợp. Hãy chọn ngày khác.</p>}
        </section>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Ghi chú</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} placeholder="Ghi cho nhân viên đọc, khách không thấy" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#2B54C3]" /></label>
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-6"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Đóng</button><button type="submit" disabled={saving || !customerId || !time} className="rounded-xl bg-[#2B54C3] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-[#2448A8] disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Đặt lịch"}</button></footer>
    </form>
  </div>;
}

function AgentModal({
  messages,
  input,
  loading,
  error,
  turns,
  rangeText,
  onClose,
  onInput,
  onSend,
  onNewChat,
  onApplyDraft,
}: {
  messages: AgentMessage[];
  input: string;
  loading: boolean;
  error: string;
  turns: number;
  rangeText: string;
  onClose: () => void;
  onInput: (value: string) => void;
  onSend: (message: string) => void;
  onNewChat: () => void;
  onApplyDraft: (draft: AgentDraft) => void;
}) {
  const suggestions = [
    { title: "Xem chỗ trống", description: "Khung nào của ngày mai còn nhận khách.", prompt: "Khung nào của ngày mai còn nhận khách trong khoảng lịch đang mở?" },
    { title: "Đặt lịch", description: "Điền sẵn form đặt cho một khách.", prompt: "Điền sẵn lịch hẹn tư vấn sản phẩm cho khách Bùi Gia Huy vào một khung giờ phù hợp." },
    { title: "Dời giờ", description: "Chuyển một cuộc hẹn sang khung khác.", prompt: "Tìm lịch gần nhất của khách và đề xuất dời sang một khung giờ trống khác trong khoảng đang mở." },
  ];
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 px-3 py-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="appointment-agent-title" className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
      <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 id="appointment-agent-title" className="text-[16px] font-bold text-slate-800">AI Agent lịch hẹn <span className="text-[#7C65D8]">✨</span></h2><p className="mt-1 text-[11px] text-slate-500">Hỏi về lịch, hoặc nhờ Agent điền sẵn một thao tác để bạn duyệt.</p></div><button type="button" aria-label="Đóng" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-2.5 sm:px-6"><p className="truncate text-[10px] text-slate-500">Agent chỉ nhìn khoảng ngày bạn đang mở: <span className="font-semibold text-slate-700">{rangeText}</span>.</p><button type="button" onClick={onNewChat} disabled={loading} className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-[#2B54C3] hover:bg-[#EEF2FC]">+ Cuộc trò chuyện mới</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {!messages.length ? <section className="rounded-2xl border border-[#E8EAF0] bg-[#F8FAFF] p-4 sm:p-5"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF0FF] text-[#2B54C3]"><Bot className="h-4 w-4" /></span><div><h3 className="text-[12px] font-bold text-slate-800">Agent đọc được lịch của bạn</h3><p className="mt-0.5 text-[10px] leading-5 text-slate-500">Hỏi ai tới lúc mấy giờ, khung nào còn trống, hay nhờ đặt và dời một cuộc hẹn. Agent không tự lưu gì — nó điền sẵn form để bạn đọc lại rồi bấm.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{suggestions.map((suggestion) => <button key={suggestion.title} type="button" disabled={turns >= 20} onClick={() => onSend(suggestion.prompt)} className="rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[#AFC2F5] hover:bg-[#F9FAFF] disabled:opacity-50"><span className="block text-[10px] font-bold text-slate-700">{suggestion.title}</span><span className="mt-1 block text-[9px] leading-4 text-slate-500">{suggestion.description}</span></button>)}</div></section> : <div className="space-y-3">{messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-5 ${message.role === "user" ? "bg-[#2B54C3] text-white" : "border border-slate-200 bg-white text-slate-700"}`}><p className="whitespace-pre-wrap">{message.content}</p>{message.draft && <button type="button" onClick={() => onApplyDraft(message.draft!)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#EEF2FC] px-3 py-2 text-[10px] font-semibold text-[#2B54C3] hover:bg-[#E1E9FF]"><Check className="h-3.5 w-3.5" />Mở biểu mẫu xem lại</button>}</div></div>)}{loading && <div className="text-[10px] text-slate-400">AI Agent đang suy nghĩ...</div>}</div>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[10px] text-rose-700">{error}</p>}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); onSend(input); }} className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <textarea value={input} onChange={(event) => onInput(event.target.value.slice(0, 4000))} rows={2} maxLength={4000} disabled={loading || turns >= 20} placeholder="Ví dụ: mai còn khung nào còn trống?" className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-[11px] outline-none focus:border-[#2B54C3] disabled:bg-slate-50" />
        <div className="mt-2 flex items-center justify-between"><span className="text-[9px] text-slate-400">{input.length}/4000 ký tự · {turns}/20 lượt</span><button type="submit" disabled={!input.trim() || loading || turns >= 20} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#2B54C3] px-3 text-[10px] font-semibold text-white hover:bg-[#2448A8] disabled:opacity-45"><Send className="h-3.5 w-3.5" />Gửi</button></div>
        <p className="mt-2 text-center text-[9px] text-slate-400">Mỗi cuộc trò chuyện tối đa 20 lượt.</p>
      </form>
    </section>
  </div>;
}

