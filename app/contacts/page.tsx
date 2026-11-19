"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ContactRound,
  Download,
  FileText,
  Grid2X2,
  Inbox,
  Link2,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Settings,
  SlidersHorizontal,
  Upload,
  Workflow,
  X,
  Trash2,
} from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MainNavigation from "@/components/main-navigation";
import NotificationDrawer, { type NotificationItem } from "@/components/notification-drawer";
import SearchCommandPalette from "@/components/search-command-palette";
import TopbarNavigation from "@/components/topbar-navigation";
import { useSettings } from "@/context/SettingsContext";

type Contact = {
  id: string;
  name: string;
  initials: string;
  avatar: string;
  email?: string | null;
  phone?: string;
  orderNumber?: string | null;
  order?: string | null;
  channel: string;
  balance: number;
  address: string;
  connected: boolean;
  tag: string;
  assignee: string;
  createdAt: string;
  activity: number;
  notes?: string[];
};

const statusTabs = ["Tất cả", "Đã kết nối", "Chưa kết nối"];
const sortOptions = [
  { value: "name", label: "Khách hàng" },
  { value: "balance", label: "Số dư" },
  { value: "createdAt", label: "Ngày tạo hồ sơ" },
  { value: "activity", label: "Hoạt động" },
] as const;
type SortKey = (typeof sortOptions)[number]["value"];

const initialFilters = {
  tag: "Tất cả",
  channel: "Tất cả",
  assignee: "Tất cả",
  created: "Mọi thời gian",
  other: "Tất cả",
};

export default function ContactsPage() {
  const { settings } = useSettings();
  const configuredCurrency = settings.general?.currencyUnit ?? settings.general?.balanceLabel;
  const balanceUnit = typeof configuredCurrency === "string" && configuredCurrency.trim()
    ? configuredCurrency
    : "Credits";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<{ id: string; contactId: string | null; name: string; preview: string }[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [receivingEnabled, setReceivingEnabled] = useState(true);
  const [activeStatus, setActiveStatus] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortOpen, setSortOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openingContactId, setOpeningContactId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [contactResponse, notificationResponse, conversationResponse] = await Promise.all([
          fetch("/api/contacts"),
          fetch("/api/notifications"),
          fetch("/api/inbox/conversations"),
        ]);
        const [contactData, notificationData, conversationData] = await Promise.all([
          contactResponse.json(),
          notificationResponse.json(),
          conversationResponse.json(),
        ]);
        const failed = [contactResponse, notificationResponse, conversationResponse].find((response) => !response.ok);
        if (failed) throw new Error([contactData, notificationData, conversationData].find((data) => data.error)?.error ?? "Không thể tải dữ liệu.");
        if (!active) return;
        setContacts(contactData.contacts);
        setNotifications(notificationData.notifications);
        setConversations(conversationData.conversations);
      } catch (error) {
        if (active) showNotice(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => { active = false; };
  }, []);

  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const filteredContacts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("vi");
    const matched = contacts.filter((contact) => {
      const matchesStatus =
        activeStatus === "Tất cả" ||
        (activeStatus === "Đã kết nối" ? contact.connected : !contact.connected);
      const matchesQuery =
        !normalizedQuery ||
        `${contact.name} ${contact.phone ?? ""} ${contact.address} ${contact.channel}`
          .toLocaleLowerCase("vi")
          .includes(normalizedQuery);
      const matchesChannel = filters.channel === "Tất cả" || contact.channel === filters.channel;
      const matchesTag = filters.tag === "Tất cả" || contact.tag === filters.tag;
      const matchesAssignee = filters.assignee === "Tất cả" || contact.assignee === filters.assignee;
      const createdDays = filters.created === "7 ngày qua" ? 7 : filters.created === "30 ngày qua" ? 30 : filters.created === "90 ngày qua" ? 90 : null;
      const matchesCreated = createdDays === null || Date.now() - Date.parse(contact.createdAt) <= createdDays * 24 * 60 * 60 * 1000;
      const matchesOther =
        filters.other === "Tất cả" ||
        (filters.other === "Có số điện thoại" ? Boolean(contact.phone) : !contact.phone);
      return matchesStatus && matchesQuery && matchesChannel && matchesTag && matchesAssignee && matchesCreated && matchesOther;
    });

    return [...matched].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "vi");
      if (sortKey === "balance") return b.balance - a.balance;
      if (sortKey === "activity") return b.activity - a.activity;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [activeStatus, contacts, filters, searchQuery, sortKey]);

  const allVisibleSelected =
    filteredContacts.length > 0 && filteredContacts.every((contact) => selectedIds.includes(contact.id));

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function toggleTheme() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);
    window.localStorage.setItem("chathub-theme", nextMode ? "dark" : "light");
  }

  function toggleContact(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !filteredContacts.some((contact) => contact.id === id))
        : [...new Set([...current, ...filteredContacts.map((contact) => contact.id)])],
    );
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

  async function saveContact(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const result = await requestJson(
        editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts",
        editingContact ? "PATCH" : "POST",
        payload,
      );
      setContacts((current) => editingContact
        ? current.map((contact) => contact.id === editingContact.id ? result.contact : contact)
        : [result.contact, ...current]);
      setDialogOpen(false);
      setEditingContact(null);
      showNotice(editingContact ? "Đã cập nhật liên hệ." : "Đã thêm liên hệ.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể lưu liên hệ.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact() {
    if (!editingContact) return;
    if (!window.confirm(`Xoá liên hệ ${editingContact.name}?`)) return;
    setSaving(true);
    try {
      await requestJson(`/api/contacts/${editingContact.id}`, "DELETE");
      setContacts((current) => current.filter((contact) => contact.id !== editingContact.id));
      setSelectedIds((current) => current.filter((id) => id !== editingContact.id));
      setDialogOpen(false);
      setEditingContact(null);
      showNotice("Đã xoá liên hệ.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể xoá liên hệ.");
    } finally {
      setSaving(false);
    }
  }

  async function openContactConversation(contact: Contact) {
    if (openingContactId) return;
    const existing = conversations.find((conversation) => conversation.contactId === contact.id);
    if (existing) {
      window.location.assign(`/inbox?conversation=${encodeURIComponent(existing.id)}`);
      return;
    }
    setOpeningContactId(contact.id);
    try {
      const result = await requestJson("/api/inbox/conversations", "POST", { contactId: contact.id });
      window.location.assign(`/inbox?conversation=${encodeURIComponent(result.conversation.id)}`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể mở hội thoại.");
    } finally {
      setOpeningContactId(null);
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

  function exportContacts() {
    const headers = ["name", "email", "phone", "channel", "balance", "address", "connected", "tag", "assignee"];
    const quote = (value: string | number | boolean | null | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(","), ...filteredContacts.map((contact) => [
      contact.name, contact.email, contact.phone, contact.channel, contact.balance, contact.address,
      contact.connected, contact.tag, contact.assignee,
    ].map(quote).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts.csv";
    link.click();
    URL.revokeObjectURL(url);
    setActionsOpen(false);
    showNotice(`Đã xuất ${filteredContacts.length} liên hệ.`);
  }

  async function importContacts(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("Tệp nhập không được vượt quá 2 MB.");
      const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("Tệp CSV không có dữ liệu.");
      const parseRow = (line: string) => {
        const values: string[] = [];
        let value = "";
        let quoted = false;
        for (let index = 0; index < line.length; index += 1) {
          const character = line[index];
          if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
          else if (character === '"') quoted = !quoted;
          else if (character === "," && !quoted) { values.push(value); value = ""; }
          else value += character;
        }
        values.push(value);
        return values;
      };
      const headers = parseRow(lines[0]).map((header) => header.trim().toLocaleLowerCase("vi"));
      const imported = lines.slice(1).map((line) => {
        const fields = parseRow(line);
        const value = (key: string) => fields[headers.indexOf(key)]?.trim() ?? "";
        const balanceText = value("balance");
        return {
          name: value("name"),
          email: value("email"),
          phone: value("phone"),
          channel: value("channel") || "Chat Plugin",
          balance: balanceText ? Number(balanceText.replace(/\./g, "").replace(",", ".")) : 0,
          address: value("address"),
          connected: value("connected").toLowerCase() !== "false",
          tag: value("tag") || "Khách hàng",
          assignee: value("assignee") || "Chưa gán",
        };
      });
      const result = await requestJson("/api/contacts/import", "POST", { contacts: imported });
      const response = await fetch("/api/contacts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể tải lại danh sách liên hệ.");
      setContacts(data.contacts);
      setActionsOpen(false);
      showNotice(`Đã nhập ${result.imported} liên hệ.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể nhập dữ liệu.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  return (
    <main className={`flex h-[100dvh] flex-col overflow-hidden text-[#202638] ${darkMode ? "bg-[#111827]" : "bg-[#F5F6FA]"}`}>
      <header className="z-50 flex h-[60px] shrink-0 items-center justify-between bg-[#131722] px-4 text-white sm:px-6">
        <div className="flex w-1/3 items-center">
          <button
            type="button"
            aria-label={drawerOpen ? "Đóng điều hướng" : "Mở điều hướng"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10 lg:hidden"
          >
            {drawerOpen ? <X className="h-[21px] w-[21px]" /> : <Menu className="h-[21px] w-[21px]" />}
          </button>
          <span className="ml-2 hidden text-sm font-bold tracking-wide lg:inline">{String(settings.general?.systemName ?? "ChatHub")}</span>
        </div>
        <h1 className="w-1/3 text-center text-[17px] font-bold tracking-wide">Liên hệ</h1>
        <div className="flex w-1/3 items-center justify-end gap-1">
          <IconButton label="Tìm kiếm nhanh" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5 text-white" />
          </IconButton>
          <button
            type="button"
            aria-label={`Thông báo, ${unreadCount} thông báo chưa đọc`}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#131722] bg-[#F04452] px-1 text-[9px] font-bold">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <TopbarNavigation />
      <div className="flex min-h-0 flex-1">
        <MainNavigation
          activePath="/contacts"
          darkMode={darkMode}
          receivingEnabled={receivingEnabled}
          onToggleDarkMode={toggleTheme}
          onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)}
        />
        <section className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1120px] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[22px] font-bold tracking-tight text-[#252C3B]">Khách hàng</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <IconButton label="Thao tác liên hệ" onClick={() => setActionsOpen((open) => !open)}>
                    <MoreHorizontal className="h-5 w-5" />
                  </IconButton>
                  {actionsOpen && (
                    <div className="absolute right-0 top-11 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                      <button type="button" onClick={exportContacts} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"><Download className="h-4 w-4" />Xuất dữ liệu</button>
                      <button type="button" onClick={() => { setActionsOpen(false); importInput.current?.click(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" />Nhập dữ liệu</button>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setEditingContact(null); setDialogOpen(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#2B54C3] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2448A8]">
                  <Plus className="h-4 w-4" />Thêm
                </button>
                <input ref={importInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importContacts(file);
                }} />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-b border-[#E5E8EF]">
              <div className="flex h-11 items-stretch gap-5">
                {statusTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => setActiveStatus(tab)}
                    aria-pressed={activeStatus === tab}
                    className={`relative text-[12px] font-semibold transition ${activeStatus === tab ? "text-[#2B54C3]" : "text-[#737B8C] hover:text-slate-700"}`}
                  >
                    {tab}
                    {activeStatus === tab && <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#2B54C3]" />}
                  </button>
                ))}
              </div>
              <span className="pb-2 text-[10px] text-slate-400 sm:hidden">{loading ? "Đang tải..." : `${filteredContacts.length} liên hệ`}</span>
            </div>

            <div className="mt-4 flex gap-2">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[#E8EAF0] bg-white px-3 text-slate-400 focus-within:ring-2 focus-within:ring-[#2B54C3]/20">
                <Search className="h-[17px] w-[17px] shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm liên hệ..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
              <div className="relative">
                <IconButton label="Bộ lọc liên hệ" onClick={() => setFilterOpen(true)}><SlidersHorizontal className="h-[18px] w-[18px]" /></IconButton>
              </div>
              <div className="relative">
                <IconButton label="Sắp xếp liên hệ" onClick={() => setSortOpen((open) => !open)}><ArrowDownUp className="h-[18px] w-[18px]" /></IconButton>
                {sortOpen && (
                  <div className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    {sortOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => { setSortKey(option.value); setSortOpen(false); }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${sortKey === option.value ? "bg-[#F2F5FC] font-semibold text-[#2B54C3]" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {option.label}
                        {sortKey === option.value && <Check className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 px-1">
              <input
                type="checkbox"
                aria-label="Chọn cả trang"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                className="h-4 w-4 rounded border-slate-300 accent-[#2B54C3]"
              />
              <span className="text-[11px] font-medium text-[#565E6D]">Chọn cả trang</span>
              <span className="text-[10px] text-[#9298A5]">({filteredContacts.length} liên hệ)</span>
              {selectedIds.length > 0 && <span className="ml-auto text-[10px] font-medium text-[#2B54C3]">Đã chọn {selectedIds.length}</span>}
            </div>

            <div className="mt-3 space-y-2.5">
              {filteredContacts.length ? filteredContacts.map((contact) => (
                <article key={contact.id} className="flex items-center gap-3 rounded-2xl border border-[#E8EAF0] bg-white px-3 py-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.03)] sm:gap-4 sm:px-4">
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${contact.name}`}
                    checked={selectedIds.includes(contact.id)}
                    onChange={() => toggleContact(contact.id)}
                    className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[#2B54C3]"
                  />
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${contact.avatar}`}>{contact.initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <button type="button" onClick={() => { setEditingContact(contact); setDialogOpen(true); }} className="truncate text-left text-[13px] font-bold text-[#272E3D] hover:text-[#2B54C3]">{contact.name}</button>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F4F8] px-2 py-1 text-[9px] font-medium text-[#647084]">
                        <Link2 className="h-3 w-3" />{contact.channel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[#8A91A0]">{contact.phone ?? "Chưa có thông tin liên lạc"}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[10px] text-[#858B99]">{contact.address}</span>
                      <span className="rounded-full bg-[#EEF2FC] px-2 py-0.5 text-[9px] font-semibold text-[#526FAE]">{contact.balance.toLocaleString("vi-VN")} {balanceUnit}</span>
                    </div>
                  </div>
                  <button type="button" aria-label={`Chỉnh sửa ${contact.name}`} onClick={() => { setEditingContact(contact); setDialogOpen(true); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9AA1AF] transition hover:bg-[#EEF2FC] hover:text-[#2B54C3]">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={openingContactId === contact.id} onClick={() => void openContactConversation(contact)} aria-label={`Mở hội thoại với ${contact.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9AA1AF] transition hover:bg-[#EEF2FC] hover:text-[#2B54C3] disabled:opacity-50">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </article>
              )              ) : loading ? (
                <div className="rounded-2xl border border-[#E8EAF0] bg-white px-6 py-12 text-center text-sm text-slate-500">Đang tải liên hệ...</div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">Không tìm thấy liên hệ phù hợp.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      <BottomNavigation activePath="/contacts" />

      {actionsOpen && <button type="button" aria-label="Đóng menu thao tác" className="fixed inset-0 z-20 cursor-default" onClick={() => setActionsOpen(false)} />}
      {sortOpen && <button type="button" aria-label="Đóng menu sắp xếp" className="fixed inset-0 z-20 cursor-default" onClick={() => setSortOpen(false)} />}

      {filterOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="contact-filter-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:p-6">
            <header className="flex items-center justify-between">
              <h2 id="contact-filter-title" className="text-[16px] font-bold text-slate-800">Bộ lọc liên hệ</h2>
              <button type="button" aria-label="Đóng bộ lọc" onClick={() => setFilterOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <FilterSelect label="Thẻ liên hệ" value={filters.tag} options={["Tất cả", "VIP", "Lead", "Khách hàng"]} onChange={(value) => setFilters((current) => ({ ...current, tag: value }))} />
              <FilterSelect label="Kênh mạng xã hội" value={filters.channel} options={["Tất cả", "Chat Plugin", "Telegram Bot", "Facebook"]} onChange={(value) => setFilters((current) => ({ ...current, channel: value }))} />
              <FilterSelect label="Nhân viên phụ trách" value={filters.assignee} options={["Tất cả", "Admin", "Chưa gán"]} onChange={(value) => setFilters((current) => ({ ...current, assignee: value }))} />
              <FilterSelect label="Thời gian tạo" value={filters.created} options={["Mọi thời gian", "7 ngày qua", "30 ngày qua", "90 ngày qua"]} onChange={(value) => setFilters((current) => ({ ...current, created: value }))} />
              <FilterSelect label="Bộ lọc khác" value={filters.other} options={["Tất cả", "Có số điện thoại", "Chưa có thông tin liên lạc"]} onChange={(value) => setFilters((current) => ({ ...current, other: value }))} />
            </div>
            <button type="button" onClick={() => setFilterOpen(false)} className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-[#2B54C3] text-xs font-semibold text-white transition hover:bg-[#2448A8]">Đóng</button>
          </section>
        </div>
      )}

      {notice && <div role="status" className="fixed bottom-[82px] left-1/2 z-[80] -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#202638] px-4 py-2.5 text-xs font-medium text-white shadow-lg md:bottom-6">{notice}</div>}

      {dialogOpen && (
        <ContactEditor
          key={editingContact?.id ?? "new"}
          contact={editingContact}
          balanceUnit={balanceUnit}
          saving={saving}
          onClose={() => { setDialogOpen(false); setEditingContact(null); }}
          onSave={saveContact}
          onDelete={deleteContact}
        />
      )}

      <NotificationDrawer
        open={notificationsOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onClose={() => setNotificationsOpen(false)}
        onReadAll={() => void updateNotification("", "all")}
        onRead={(id) => void updateNotification(id, "read")}
        onDelete={(id) => void updateNotification(id, "delete")}
      />
      <SearchCommandPalette
        open={searchOpen}
        conversations={conversations}
        contacts={contacts}
        onClose={() => setSearchOpen(false)}
        onOpenConversation={(id) => window.location.assign(`/inbox?conversation=${encodeURIComponent(id)}`)}
      />
      <MainNavigation
        mobile
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activePath="/contacts"
        darkMode={darkMode}
        receivingEnabled={receivingEnabled}
        onToggleDarkMode={toggleTheme}
        onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)}
      />
    </main>
  );
}

function ContactEditor({
  contact,
  balanceUnit,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  contact: Contact | null;
  balanceUnit: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [channel, setChannel] = useState(contact?.channel ?? "Chat Plugin");
  const [balance, setBalance] = useState(String(contact?.balance ?? 0));
  const [address, setAddress] = useState(contact?.address ?? "");
  const [connected, setConnected] = useState(contact?.connected ?? true);
  const [tag, setTag] = useState(contact?.tag ?? "Khách hàng");
  const [assignee, setAssignee] = useState(contact?.assignee ?? "Chưa gán");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({ name, email, phone, channel, balance, address, connected, tag, assignee });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.25)] sm:p-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-slate-800">{contact ? "Chỉnh sửa liên hệ" : "Thêm liên hệ"}</h2>
            <p className="mt-1 text-xs text-slate-500">Thông tin được lưu vào cơ sở dữ liệu.</p>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <EditorField label="Tên khách hàng" value={name} onChange={setName} required />
          <EditorField label="Số điện thoại" value={phone} onChange={setPhone} />
          <EditorField label="Email" value={email} onChange={setEmail} type="email" />
          <EditorField label={`Số dư (${balanceUnit})`} value={balance} onChange={setBalance} type="number" min="0" step="0.01" />
          <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-600">Kênh</span><select value={channel} onChange={(event) => setChannel(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#2B54C3]"><option>Chat Plugin</option><option>Telegram Bot</option><option>Facebook</option><option>Messenger</option><option>Zalo</option><option>Website</option></select></label>
          <EditorField label="Thẻ liên hệ" value={tag} onChange={setTag} />
          <EditorField label="Nhân viên phụ trách" value={assignee} onChange={setAssignee} />
          <EditorField label="Địa chỉ" value={address} onChange={setAddress} />
          <label className="flex items-center gap-2 self-end pb-3 text-xs font-medium text-slate-600"><input type="checkbox" checked={connected} onChange={(event) => setConnected(event.target.checked)} className="h-4 w-4 accent-[#2B54C3]" />Đã kết nối</label>
        </div>
        <footer className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          {contact ? <button type="button" disabled={saving} onClick={() => void onDelete()} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" />Xoá</button> : <span />}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Huỷ</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-[#2B54C3] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2448A8] disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </footer>
      </form>
    </div>
  );
}

function EditorField({
  label,
  value,
  onChange,
  type = "text",
  ...inputProps
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold text-slate-600">{label}</span>
      <input {...inputProps} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#2B54C3] focus:ring-2 focus:ring-[#2B54C3]/10" />
    </label>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold text-slate-600">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#2B54C3] focus:ring-2 focus:ring-[#2B54C3]/10">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
