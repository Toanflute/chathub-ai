"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ContactRound,
  ImagePlus,
  Inbox,
  Info,
  Layers2,
  Languages,
  Link2,
  Menu,
  MessageCircle,
  Mic,
  Moon,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Smile,
  Sun,
  Tag,
  X,
  Zap,
} from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MainNavigation, { adminLinks, automationLinks, primaryLinks } from "@/components/main-navigation";
import NotificationDrawer, { type NotificationItem } from "@/components/notification-drawer";
import SearchCommandPalette from "@/components/search-command-palette";
import { useSettings } from "@/context/SettingsContext";

type Conversation = {
  id: string;
  contactId: string | null;
  channelConnectionId: string | null;
  name: string;
  initials: string;
  avatar: string;
  channel: "messenger" | "web" | "telegram" | "zalo";
  channelLabel: string;
  date: string;
  preview: string;
  unread: number;
  status: "Đang mở" | "Chờ xử lý" | "Đã xong" | "Đã đóng";
  labels: string[];
  ad?: boolean;
  team: string;
  priority: string;
  botEnabled: boolean;
  contactTag: string;
  balance: number;
  address: string;
  activity: number;
  email: string;
  phone: string;
  order: string;
  assignee: string;
  messages: { id: string; role: string; content: string; createdAt: string }[];
  notes: string[];
};
type ChannelConnection = { id: string; name: string; platform: string; enabled: boolean };

const statuses = ["Tất cả", "Đang mở", "Chờ xử lý", "Đã xong", "Đã đóng", "Chưa đọc"];
const audiences = ["Mọi người", "Của tôi", "Đội tôi", "Chưa gán"];
const inboxLabels = [
  { name: "Chờ đơn hàng", color: "bg-blue-500" },
  { name: "Hỏi giá sỉ", color: "bg-emerald-500" },
  { name: "Khách VIP", color: "bg-violet-500" },
  { name: "Khiếu nại", color: "bg-rose-500" },
  { name: "Gấp", color: "bg-orange-500" },
];

function ChannelMark({ channel }: { channel: Conversation["channel"] }) {
  const isWeb = channel === "web";
  const isTelegram = channel === "telegram";
  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border-2 border-white ${
        isTelegram || channel === "zalo" ? "bg-[#16B8A6] text-white" : "bg-[#1877F2] text-white"
      }`}
      aria-label={`Kênh ${channel}`}
    >
      {isWeb ? <MessageCircle className="h-2.5 w-2.5" /> : <span className="text-[8px] font-bold">{isTelegram ? "➤" : channel === "zalo" ? "Z" : "f"}</span>}
    </span>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function InboxPage() {
  const { settings } = useSettings();
  const configuredCurrency = settings.general?.currencyUnit ?? settings.general?.balanceLabel;
  const balanceUnit = typeof configuredCurrency === "string" && configuredCurrency.trim()
    ? configuredCurrency
    : "Credits";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [channelConnections, setChannelConnections] = useState<ChannelConnection[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState("Tất cả");
  const [activeAudience, setActiveAudience] = useState("Mọi người");
  const [activeChannelId, setActiveChannelId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [receivingEnabled, setReceivingEnabled] = useState(true);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [customerDetailsVisible, setCustomerDetailsVisible] = useState(true);
  const [composerMode, setComposerMode] = useState<"message" | "note">("message");
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [profileLabelsOpen, setProfileLabelsOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState("");
  const [showProfileMobile, setShowProfileMobile] = useState(false);
  const [navigationMenu, setNavigationMenu] = useState<"automation" | "admin" | "profile" | null>(null);
  const [autoTranslate, setAutoTranslate] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("chathub-theme");
    const useDarkMode = savedTheme === "dark";
    setDarkMode(useDarkMode);
    document.documentElement.classList.toggle("dark", useDarkMode);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const [conversationResponse, notificationResponse, channelResponse] = await Promise.all([
          fetch("/api/inbox/conversations"),
          fetch("/api/notifications"),
          fetch("/api/channels"),
        ]);
        const [conversationData, notificationData, channelData] = await Promise.all([
          conversationResponse.json(),
          notificationResponse.json(),
          channelResponse.json(),
        ]);
        if (!conversationResponse.ok || !notificationResponse.ok || !channelResponse.ok) {
          throw new Error(conversationData.error ?? notificationData.error ?? channelData.error ?? "Không thể tải dữ liệu.");
        }
        if (!active) return;
        const items: Conversation[] = conversationData.conversations;
        setConversations(items);
        setChannelConnections(channelData.channels);
        setNotifications(notificationData.notifications);
        const requestedChannelId = new URLSearchParams(window.location.search).get("channel");
        if (requestedChannelId && channelData.channels.some((channel: ChannelConnection) => channel.id === requestedChannelId)) {
          setActiveChannelId(requestedChannelId);
        }
        const requestedId = new URLSearchParams(window.location.search).get("conversation");
        const initial = items.find((item) => item.id === requestedId)
          ?? items.find((item) => item.channelConnectionId === requestedChannelId)
          ?? items[0];
        if (initial) {
          setSelectedId(initial.id);
          setNoteDraft(initial.notes?.join("\n") ?? "");
          if (requestedId) setDetailOpen(true);
          if (initial.unread > 0) void markConversationRead(initial.id);
        }
      } catch (error) {
        if (active) showNotice(error instanceof Error ? error.message : "Không thể tải hộp thư.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadData();
    return () => { active = false; };
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return conversations.filter((conversation) => {
      const matchesStatus =
        activeStatus === "Tất cả" ||
        (activeStatus === "Chưa đọc"
          ? conversation.unread > 0
          : conversation.status === activeStatus);
      const matchesQuery =
        !normalizedQuery ||
        `${conversation.name} ${conversation.preview} ${conversation.phone} ${conversation.email} ${conversation.labels.join(" ")}`.toLocaleLowerCase("vi").includes(normalizedQuery);
      const matchesAudience =
        activeAudience === "Mọi người" ||
        (activeAudience === "Của tôi" ? conversation.assignee === "Admin"
          : activeAudience === "Đội tôi" ? conversation.team !== "Chưa phân công"
            : conversation.assignee === "Chưa gán");
      const matchesChannel = !activeChannelId || conversation.channelConnectionId === activeChannelId;
      return matchesStatus && matchesQuery && matchesAudience && matchesChannel;
    });
  }, [activeAudience, activeChannelId, activeStatus, conversations, query]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0] ?? {
    id: "", contactId: null, channelConnectionId: null, name: "Chọn một hội thoại", initials: "KH", avatar: "bg-slate-100 text-slate-700",
    channel: "web" as const, channelLabel: "Website cmsnt.co", date: "", preview: "", unread: 0, status: "Đang mở" as const, labels: [],
    email: "", phone: "", order: "", assignee: "Chưa gán", team: "Chưa phân công", priority: "Bình thường", botEnabled: true,
    contactTag: "", balance: 0, address: "", activity: 0, messages: [], notes: [],
  };
  const unreadNotificationCount = notifications.filter((notification) => notification.unread).length;
  const unreadConversationCount = conversations.reduce((total, conversation) => total + conversation.unread, 0);
  const visibleMessages = selected.messages.filter((message) =>
    message.content.toLocaleLowerCase("vi").includes(messageSearch.trim().toLocaleLowerCase("vi")),
  );

  useEffect(() => {
    if (!selected.contactId || noteDraft === selected.notes.join("\n")) return;
    const timer = window.setTimeout(() => { void saveNote(false); }, 700);
    return () => window.clearTimeout(timer);
  }, [noteDraft, selected.contactId, selected.id, selected.notes]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
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

  async function markConversationRead(id: string) {
    try {
      await requestJson(`/api/inbox/conversations/${id}`, "PATCH", { read: true });
      setConversations((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể đánh dấu đã đọc.");
    }
  }

  async function changeConversation(id: string, patch: Record<string, unknown>) {
    try {
      await requestJson(`/api/inbox/conversations/${id}`, "PATCH", patch);
      const response = await fetch("/api/inbox/conversations");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể tải lại hội thoại.");
      setConversations(data.conversations);
      if (patch.archive === true) {
        const next = data.conversations[0] as Conversation | undefined;
        setSelectedId(next?.id ?? "");
        setDetailOpen(false);
      }
      setConversationMenuOpen(false);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật hội thoại.");
    }
  }

  async function deleteConversation(id: string) {
    try {
      await requestJson(`/api/inbox/conversations/${id}`, "DELETE");
      const remaining = conversations.filter((conversation) => conversation.id !== id);
      setConversations(remaining);
      setSelectedId(remaining[0]?.id ?? "");
      setConversationMenuOpen(false);
      setDetailOpen(false);
      showNotice("Đã xoá hội thoại.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể xoá hội thoại.");
    }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !reply.trim() || savingReply) return;
    setSavingReply(true);
    try {
      const internalNote = composerMode === "note";
      const result = await requestJson(`/api/inbox/conversations/${selected.id}/messages`, "POST", { content: reply, internalNote });
      setConversations((current) => current.map((item) => item.id === selected.id
        ? {
          ...item,
          preview: internalNote ? item.preview : result.message.content,
          messages: [...item.messages, result.message],
          status: internalNote ? item.status : "Đang mở",
        }
        : item));
      setReply("");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : composerMode === "note" ? "Không thể lưu ghi chú." : "Không thể gửi tin nhắn.");
    } finally {
      setSavingReply(false);
    }
  }

  async function saveNote(showFeedback = true) {
    if (!selected?.contactId) {
      showNotice("Hội thoại này chưa liên kết với liên hệ.");
      return;
    }
    setSavingNote(true);
    try {
      const notes = noteDraft.split("\n").map((note) => note.trim()).filter(Boolean);
      await requestJson(`/api/contacts/${selected.contactId}`, "PATCH", { notes });
      setConversations((current) => current.map((item) => item.id === selected.id ? { ...item, notes } : item));
      if (showFeedback) showNotice("Đã lưu ghi chú.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể lưu ghi chú.");
    } finally {
      setSavingNote(false);
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

  function toggleDarkMode() {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    document.documentElement.classList.toggle("dark", nextMode);
    window.localStorage.setItem("chathub-theme", nextMode ? "dark" : "light");
  }

  async function toggleConversationLabel(label: string) {
    if (!selected.id) return;
    const labels = selected.labels.includes(label)
      ? selected.labels.filter((item) => item !== label)
      : [...selected.labels, label];
    await changeConversation(selected.id, { labels });
  }

  return (
    <main data-theme={darkMode ? "dark" : "light"} className={`flex h-[100dvh] flex-col overflow-hidden text-[#202638] ${darkMode ? "bg-[#0F131D]" : "bg-[#F5F6FA]"}`}>
      <header className="z-40 flex h-[58px] shrink-0 items-center justify-between bg-[#131722] px-3 text-white sm:px-5">
        <div className="flex w-1/3 items-center lg:hidden">
          <button
            type="button"
            aria-label={drawerOpen ? "Đóng điều hướng" : "Mở điều hướng"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10"
          >
            {drawerOpen ? <X className="h-[21px] w-[21px]" /> : <Menu className="h-[21px] w-[21px]" />}
          </button>
        </div>
        <h1 className="w-1/3 text-center text-[17px] font-bold tracking-wide lg:hidden">Tin nhắn</h1>
        <div className="flex w-1/3 items-center justify-end gap-1 lg:hidden">
          <IconButton label="Tìm kiếm" onClick={() => setSearchOpen(true)}><Search className="h-5 w-5 text-white" /></IconButton>
          <button
            type="button"
            aria-label={`Thông báo, ${unreadNotificationCount} thông báo chưa đọc`}
            aria-expanded={notificationsOpen}
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#131722] bg-[#F04452] px-1 text-[9px] font-bold">{unreadNotificationCount}</span>}
          </button>
        </div>

        <div className={`hidden h-full min-w-0 flex-1 items-center gap-5 ${settings.appearance?.menuLayout === "sidebar" ? "lg:hidden" : "lg:flex"}`}>
          <a href="/inbox" className="shrink-0 text-[14px] font-extrabold tracking-tight">{String(settings.general?.systemName ?? "ChatHub")}</a>
          <nav aria-label="Điều hướng chính" className="flex min-w-0 flex-1 items-center gap-1">
            {primaryLinks.map(({ label, href, icon: Icon, badge }) => (
              <a key={href} href={href} className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[11px] font-semibold transition ${href === "/inbox" ? "bg-[#2B54C3]/25 text-blue-200" : "text-slate-300 hover:bg-white/10"}`}>
                <Icon className="h-4 w-4" />{label}
                {badge && <span className="rounded-full bg-[#2B54C3] px-1.5 py-0.5 text-[9px] text-white">{badge}</span>}
              </a>
            ))}
            {([
              ["automation", "Tự động hoá", automationLinks, Zap],
              ["admin", "Quản trị", adminLinks, Settings],
            ] as const).map(([key, label, links, Icon]) => (
              <div key={key} className="relative">
                <button type="button" onClick={() => setNavigationMenu(navigationMenu === key ? null : key)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10">
                  <Icon className="h-4 w-4" />{label}<ChevronDown className="h-3 w-3" />
                  {key === "admin" && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] text-white">3</span>}
                </button>
                {navigationMenu === key && (
                  <div className="absolute left-0 top-11 z-50 w-48 rounded-xl border border-slate-700 bg-[#1B2230] p-1.5 shadow-xl">
                    {links.map(({ label: itemLabel, href: itemHref, icon: ItemIcon }) => <a key={itemHref} href={itemHref} onClick={() => setNavigationMenu(null)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10"><ItemIcon className="h-4 w-4" />{itemLabel}</a>)}
                  </div>
                )}
              </div>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" role="switch" aria-checked={receivingEnabled} aria-label="Nhận hội thoại mới" onClick={() => setReceivingEnabled((enabled) => !enabled)} className={`relative h-[18px] w-8 rounded-full transition ${receivingEnabled ? "bg-emerald-500" : "bg-slate-600"}`}><span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition ${receivingEnabled ? "left-[16px]" : "left-[2px]"}`} /></button>
            <IconButton label="Tìm kiếm" onClick={() => setSearchOpen(true)}><Search className="h-[18px] w-[18px] text-white" /></IconButton>
            <button type="button" aria-label="Thông báo" onClick={() => setNotificationsOpen((open) => !open)} className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><Bell className="h-[18px] w-[18px]" />{unreadNotificationCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px]">{unreadNotificationCount}</span>}</button>
            <button type="button" aria-label="Chuy đổi giao diện" onClick={toggleDarkMode} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10">{darkMode ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
            <div className="relative">
              <button type="button" onClick={() => setNavigationMenu(navigationMenu === "profile" ? null : "profile")} className="flex h-9 items-center gap-2 rounded-lg px-2 text-[11px] text-white hover:bg-white/10"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3A33B] text-[9px] font-bold">AD</span>Admin<ChevronDown className="h-3 w-3" /></button>
              {navigationMenu === "profile" && <div className="absolute right-0 top-11 z-50 w-36 rounded-xl border border-slate-700 bg-[#1B2230] p-1.5 shadow-xl"><button type="button" onClick={() => { document.cookie = "chathub-auth=; path=/; max-age=0; SameSite=Lax"; window.localStorage.removeItem("chathub-auth"); window.location.replace("/login"); }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-rose-300 hover:bg-white/10">Đăng xuất</button></div>}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="Lọc hộp thư" className="hidden w-[54px] shrink-0 flex-col items-center gap-1 border-r border-[#E9EBF1] bg-white py-3 lg:flex inbox-surface inbox-border">
          {[
            ["Tất cả", Inbox],
            ["Chưa đọc", MessageCircle],
            ["Chờ xử lý", CalendarDays],
            ["Đã xong", CheckCheck],
            ["Đã đóng", Archive],
            ["Đội tôi", ContactRound],
            ["Nhãn", Tag],
          ].map(([label, Icon]) => (
            <button key={label as string} type="button" aria-label={label as string} title={label as string} onClick={() => label === "Nhãn" ? setLabelsOpen((open) => !open) : setActiveStatus(statuses.includes(label as string) ? label as string : "Tất cả")} className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${activeStatus === label ? "bg-[#EAF0FF] text-[#2B54C3]" : "text-slate-500 hover:bg-slate-100"}`}><Icon className="h-[17px] w-[17px]" /></button>
          ))}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
        <aside className={`${detailOpen ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-[#E9EBF1] bg-white inbox-surface inbox-border md:w-[350px] lg:w-[340px] xl:w-[360px]`}>
          <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[21px] font-bold tracking-tight inbox-primary-text">Hộp thư</h2>
              <div className="flex items-center gap-1">
                <span className="rounded-full bg-[#EAF0FF] px-3 py-1.5 text-[11px] font-semibold text-[#2B54C3]">{unreadConversationCount} chưa đọc</span>
                <IconButton label="Đánh dấu tất cả đã đọc" onClick={async () => {
                  try {
                    await requestJson("/api/inbox/conversations", "PATCH");
                    setConversations((current) => current.map((conversation) => ({ ...conversation, unread: 0 })));
                  } catch (error) {
                    showNotice(error instanceof Error ? error.message : "Không thể đánh dấu đã đọc.");
                  }
                }}><CheckCheck className="h-[18px] w-[18px]" /></IconButton>
                <IconButton label="Cài đặt hộp thư" onClick={() => setFilterOpen((open) => !open)}><Settings className="h-[18px] w-[18px]" /></IconButton>
              </div>
            </div>
            <p className="mt-1 text-[10px] text-[#858B99] inbox-muted-text">• Đang xem: {activeStatus} · {activeAudience}</p>

            <div className="mt-3 flex gap-2">
              <label className="inbox-subtle flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-[#F4F5F8] px-3 text-slate-400 focus-within:ring-2 focus-within:ring-[#2B54C3]/20">
                <Search className="h-[17px] w-[17px] shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm khách hàng hoặc nội dung"
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400 inbox-secondary-text"
                />
              </label>
              <IconButton label={compactView ? "Dùng danh sách thoáng" : "Dùng danh sách gọn"} onClick={() => setCompactView((compact) => !compact)}><Layers2 className="h-[18px] w-[18px]" /></IconButton>
              <div className="relative">
                <IconButton label="Bộ lọc" onClick={() => setFilterOpen((open) => !open)}><SlidersHorizontal className="h-[18px] w-[18px]" /></IconButton>
                {filterOpen && (
                  <div className="inbox-surface absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <p className="text-xs font-semibold text-slate-700">Lọc hội thoại</p>
                    <button type="button" onClick={() => { setActiveStatus("Chưa đọc"); setFilterOpen(false); }} className="mt-2 w-full rounded-lg px-2 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Chỉ hội thoại chưa đọc</button>
                    <button type="button" onClick={() => { setActiveStatus("Tất cả"); setFilterOpen(false); }} className="w-full rounded-lg px-2 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">Xóa bộ lọc trạng thái</button>
                  </div>
                )}
              </div>
            </div>

            <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {statuses.map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setActiveStatus(status)}
                    className={`shrink-0 rounded-full px-3 py-[7px] text-[11px] font-semibold transition ${
                      activeStatus === status ? "bg-[#EEF0F5] text-[#31394B] dark:bg-slate-700 dark:text-slate-100" : "bg-white text-[#737B8C] hover:bg-slate-50 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >{status}</button>
              ))}
            </div>

            <div className="inbox-subtle mt-3 flex rounded-xl bg-[#F2F3F7] p-1">
              {audiences.map((audience) => (
                <button
                  type="button"
                  key={audience}
                  onClick={() => setActiveAudience(audience)}
                  className={`min-w-0 flex-1 rounded-lg px-1 py-2 text-[10px] font-semibold transition sm:text-[11px] ${
                    activeAudience === audience ? "bg-white text-[#343B4C] shadow-sm dark:bg-slate-600 dark:text-white" : "text-[#7A8292] dark:text-slate-400"
                  }`}
                >{audience}</button>
              ))}
            </div>
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveChannelId("")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold ${!activeChannelId ? "bg-[#EAF0FF] text-[#2B54C3]" : "bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                Tất cả kênh
              </button>
              {channelConnections.map((channel) => (
                <button
                  type="button"
                  key={channel.id}
                  onClick={() => setActiveChannelId(channel.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold ${activeChannelId === channel.id ? "bg-[#EAF0FF] text-[#2B54C3]" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                >
                  {channel.name}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#F0F1F4] inbox-border">
            {filteredConversations.length ? filteredConversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => { setSelectedId(conversation.id); setNoteDraft(conversation.notes.join("\n")); setDetailOpen(true); setConversationMenuOpen(false); if (conversation.unread > 0) void markConversationRead(conversation.id); }}
                className={`group relative block w-full border-b border-[#F0F1F4] px-4 text-left transition hover:bg-[#F8F9FC] dark:border-slate-700 dark:hover:bg-slate-800 sm:px-5 ${compactView ? "py-2" : "py-3.5"} ${
                selectedId === conversation.id ? "md:bg-[#F5F7FD] md:before:absolute md:before:bottom-0 md:before:left-0 md:before:top-0 md:before:w-[3px] md:before:bg-[#2B54C3] dark:md:bg-slate-800" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${conversation.avatar}`}>
                    {conversation.initials}<ChannelMark channel={conversation.channel} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#262D3D] inbox-primary-text">{conversation.name}</span>
                      <span className="shrink-0 text-[10px] font-medium text-[#2B54C3]">{conversation.date}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[#818899] inbox-muted-text">{conversation.preview}</span>
                      {conversation.unread > 0 && <span className="flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full bg-[#2B54C3] px-1 text-[9px] font-bold text-white">{conversation.unread}</span>}
                      <span onClick={(event) => { event.stopPropagation(); setSelectedId(conversation.id); setDetailOpen(true); setConversationMenuOpen((open) => !open); }} className="flex h-6 w-5 shrink-0 items-center justify-center text-[#9BA1AF] opacity-70 hover:text-slate-700">
                        <MoreVertical className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${
                        conversation.status === "Đang mở" ? "text-[#17996C]" : conversation.status === "Chờ xử lý" ? "text-[#D18A19]" : "text-[#858B99]"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${conversation.status === "Đang mở" ? "bg-[#20B47A]" : conversation.status === "Chờ xử lý" ? "bg-[#E6A333]" : "bg-[#A4A9B4]"}`} />
                        {conversation.status}
                      </span>
                      {conversation.labels.map((label) => (
                        <span key={label} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                          label === "Bot" ? "bg-[#EDF3FF] text-[#6381C8]" : label === "Khách VIP" ? "bg-violet-50 text-violet-700" : label === "Chờ đơn hàng" ? "bg-blue-50 text-blue-700" : label === "Hỏi giá sỉ" ? "bg-emerald-50 text-emerald-700" : "bg-[#FFF0F1] text-[#DE5961]"
                        }`}>
                          {label === "Bot" ? <Bot className="h-2.5 w-2.5" /> : label === "Khiếu nại" || label === "Gấp" ? <ShieldAlert className="h-2.5 w-2.5" /> : <Tag className="h-2.5 w-2.5" />}{label}
                        </span>
                      ))}
                      {conversation.ad && <span className="ml-auto flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#F3A73B] text-[8px] font-extrabold text-white">AD</span>}
                    </div>
                  </div>
                </div>
              </button>
            )) : (
              <div className="px-6 py-12 text-center text-sm text-slate-500">{loading ? "Đang tải hộp thư..." : "Không tìm thấy hội thoại phù hợp."}</div>
            )}
          </div>
        </aside>

        <section className={`${detailOpen && !showProfileMobile ? "flex" : "hidden md:flex"} inbox-panel min-w-0 flex-1 flex-col bg-[#F8F9FC]`}>
          <div className="inbox-surface inbox-border flex h-[62px] shrink-0 items-center justify-between border-b border-[#E9EBF1] bg-white px-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" aria-label="Quay lại danh sách" onClick={() => { setDetailOpen(false); setShowProfileMobile(false); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"><ArrowLeft className="h-5 w-5" /></button>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected.avatar}`}>{selected.initials}</div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold inbox-primary-text">{selected.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[#858B99] inbox-muted-text"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#20B47A]" />{selected.channelLabel} · {selected.assignee === "Chưa gán" ? "chưa phân công" : selected.assignee}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-1">
              <IconButton label="Tìm trong hội thoại" onClick={() => setMessageSearchOpen((open) => !open)}><Search className="h-[18px] w-[18px]" /></IconButton>
              <IconButton label={autoTranslate ? "Tắt dịch tự động" : "Bật dịch tự động"} onClick={() => setAutoTranslate((enabled) => !enabled)}><Languages className={`h-[18px] w-[18px] ${autoTranslate ? "text-[#2B54C3]" : ""}`} /></IconButton>
              <IconButton label="Thêm tùy chọn" onClick={() => setConversationMenuOpen((open) => !open)}><MoreVertical className="h-[18px] w-[18px]" /></IconButton>
              <IconButton label="Thông tin khách hàng" onClick={() => {
                if (window.matchMedia("(min-width: 1280px)").matches) setCustomerDetailsVisible((visible) => !visible);
                else setShowProfileMobile(true);
              }}><Info className="h-[18px] w-[18px]" /></IconButton>
              {conversationMenuOpen && selected.id && (
                <div className="inbox-surface absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  {[
                    ["open", "Đang mở"],
                    ["pending", "Chờ xử lý"],
                    ["resolved", "Đã xong"],
                    ["closed", "Đã đóng"],
                  ].map(([status, label]) => (
                    <button key={status} type="button" onClick={() => void changeConversation(selected.id, { status })} className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">{label}</button>
                  ))}
                  <button type="button" onClick={() => void changeConversation(selected.id, { archive: true })} className="w-full rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50">Lưu trữ hội thoại</button>
                  <button type="button" onClick={() => {
                    if (window.confirm("Bạn có chắc muốn xoá hội thoại này?")) void deleteConversation(selected.id);
                  }} className="w-full rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50">Xoá hội thoại</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-8 sm:py-5">
            {messageSearchOpen && <input autoFocus value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Tìm trong tin nhắn..." className="inbox-surface inbox-border inbox-secondary-text mb-4 h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#2B54C3]" />}
            {visibleMessages.length > 0 && <div className="mb-5 text-center text-[10px] font-medium text-slate-400">{new Date(visibleMessages[0].createdAt).toLocaleDateString("vi-VN")}</div>}
            {visibleMessages.map((message, index) => {
              const incoming = message.role === "user";
              const internalNote = message.role === "note";
              if (internalNote) {
                return <div key={message.id} className="mx-auto mb-4 max-w-[85%] rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><p className="mb-1 text-[9px] font-bold uppercase tracking-wide">Ghi chú nội bộ</p>{message.content}<span className="ml-2 whitespace-nowrap text-[9px] text-amber-700 dark:text-amber-300">{new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span></div>;
              }
              return (
                <div key={message.id} className={`mb-4 flex items-end gap-2 ${incoming ? "" : "justify-end"}`}>
                  {incoming && <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${selected.avatar}`}>{selected.initials}</div>}
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] sm:max-w-[70%] ${incoming ? "inbox-surface inbox-border inbox-secondary-text rounded-bl-md border border-[#E9EBF1] bg-white text-[#3D4556]" : "rounded-br-md bg-[#2B54C3] text-white"}`}>
                    {message.content}
                  </div>
                  <span className="mb-1 text-[9px] text-[#A0A5B0]">{new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  {index === visibleMessages.length - 1 && <span className="sr-only">Tin nhắn mới nhất</span>}
                </div>
              );
            })}
            {!visibleMessages.length && <p className="py-8 text-center text-xs text-slate-400">{messageSearch ? "Không tìm thấy tin nhắn." : "Chưa có tin nhắn trong hội thoại này."}</p>}
            <div className="mt-auto min-h-8" />
            <div data-mode={composerMode} className={`inbox-composer relative rounded-2xl border p-3 shadow-[0_2px_10px_rgba(21,31,56,0.04)] ${composerMode === "note" ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" : "border-[#2B54C3]/50 bg-white"}`}>
              <div className="mb-2 flex items-center gap-1">
                <button type="button" onClick={() => setComposerMode("message")} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${composerMode === "message" ? "bg-[#2B54C3] text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>Nhắn tin</button>
                <button type="button" onClick={() => setComposerMode("note")} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${composerMode === "note" ? "bg-amber-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>Ghi chú nội bộ</button>
                <div className="relative ml-auto">
                  <button type="button" onClick={() => setLabelsOpen((open) => !open)} className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2 py-1.5 text-[10px] font-semibold text-slate-500 hover:border-[#2B54C3] hover:text-[#2B54C3] dark:border-slate-600"><Tag className="h-3.5 w-3.5" />Gắn nhãn</button>
                  {labelsOpen && <div className="inbox-surface absolute bottom-10 right-0 z-30 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><label className="inbox-subtle flex h-8 items-center gap-2 rounded-lg bg-slate-50 px-2 text-slate-400"><Search className="h-3.5 w-3.5" /><input value={labelSearch} onChange={(event) => setLabelSearch(event.target.value)} placeholder="Tìm nhãn..." className="w-full bg-transparent text-[10px] outline-none" /></label><div className="mt-1 max-h-40 overflow-auto">{inboxLabels.filter(({ name }) => name.toLocaleLowerCase("vi").includes(labelSearch.trim().toLocaleLowerCase("vi"))).map(({ name, color }) => <button key={name} type="button" onClick={() => void toggleConversationLabel(name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800"><span className={`h-2 w-2 rounded-full ${color}`} />{name}{selected.labels.includes(name) && <Check className="ml-auto h-3.5 w-3.5 text-[#2B54C3]" />}</button>)}</div></div>}
                </div>
              </div>
              <form onSubmit={sendReply}>
                <textarea value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={4000} placeholder={composerMode === "note" ? "Ghi chú này chỉ đội ngũ nội bộ nhìn thấy..." : "Nhập nội dung tin nhắn và nhấn Enter để gửi"} disabled={!selected.id || savingReply} className="min-h-12 w-full resize-y rounded-lg bg-transparent px-1 text-[12px] leading-5 text-slate-700 outline-none placeholder:text-[#A2A7B2] inbox-secondary-text disabled:opacity-50" />
                <div className="mt-2 flex items-center justify-between border-t border-[#F0F1F4] pt-2 dark:border-slate-700">
                  <div className="flex items-center gap-0.5">
                    <span className="mr-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#F3A33B] text-[8px] font-bold text-white">AD</span>
                    <IconButton label="Gợi ý AI" onClick={() => setReply("Dạ, shop đã nhận được thông tin. Mình sẽ kiểm tra và phản hồi bạn sớm ạ.")}><Sparkles className="h-4 w-4" /></IconButton>
                    <IconButton label="Chèn liên kết" onClick={() => setReply((text) => `${text} https://`)}><Link2 className="h-4 w-4" /></IconButton>
                    <IconButton label="Trả lời nhanh" onClick={() => setReply("Dạ, shop đã nhận được thông tin. Mình sẽ kiểm tra và phản hồi bạn sớm ạ.")}><Zap className="h-4 w-4" /></IconButton>
                    <IconButton label="Chèn biểu tượng cảm xúc" onClick={() => setReply((text) => `${text}🙂`)}><Smile className="h-4 w-4" /></IconButton>
                    <IconButton label="Ghi âm (chưa khả dụng)" disabled><Mic className="h-4 w-4" /></IconButton>
                    <IconButton label="Gửi ảnh (chưa khả dụng)" disabled><ImagePlus className="h-4 w-4" /></IconButton>
                    <IconButton label="Đính kèm tệp (chưa khả dụng)" disabled><Paperclip className="h-4 w-4" /></IconButton>
                  </div>
                  <button type="submit" disabled={!reply.trim() || savingReply} aria-label={composerMode === "note" ? "Lưu ghi chú nội bộ" : "Gửi tin nhắn"} className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${composerMode === "note" ? "bg-amber-600 hover:bg-amber-700" : "bg-[#2B54C3] hover:bg-[#2448A8]"}`}>{composerMode === "note" ? "Lưu ghi chú" : "Gửi"}<Send className="h-3.5 w-3.5" /></button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <aside className={`${showProfileMobile ? "flex" : "hidden xl:flex"} ${customerDetailsVisible ? "" : "xl:hidden"} inbox-surface inbox-border w-full shrink-0 flex-col border-l border-[#E9EBF1] bg-white xl:w-[310px]`}>
          <div className="inbox-border flex h-[62px] shrink-0 items-center justify-between border-b border-[#E9EBF1] px-4">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Quay lại hội thoại" onClick={() => setShowProfileMobile(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 xl:hidden"><ArrowLeft className="h-5 w-5" /></button>
              <h2 className="text-[11px] font-extrabold tracking-[0.12em] inbox-primary-text">HỒ SƠ KHÁCH HÀNG</h2>
            </div>
            <IconButton label={customerDetailsVisible ? "Thu gọn thông tin" : "Mở thông tin"} onClick={() => setCustomerDetailsVisible((visible) => !visible)}><ChevronDown className={`h-4 w-4 transition ${customerDetailsVisible ? "" : "rotate-180"}`} /></IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex flex-col items-center border-b border-[#F0F1F4] pb-4 text-center dark:border-slate-700">
              <div className={`flex h-[58px] w-[58px] items-center justify-center rounded-full text-lg font-bold ${selected.avatar}`}>{selected.initials}</div>
              <h3 className="mt-2 text-[14px] font-bold inbox-primary-text">{selected.name}</h3>
              <p className="mt-1 text-[10px] text-[#828999] inbox-muted-text">{selected.channelLabel}</p>
            </div>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <h3 className="text-[10px] font-bold text-slate-500">TRẠNG THÁI BOT</h3>
              <p className={`mt-2 text-[10px] leading-4 ${selected.botEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>• {selected.botEnabled ? "Bot đang trả lời — Automation và kịch bản vẫn chạy trên hội thoại này." : "Đang tiếp quản thủ công — bot tạm dừng trên hội thoại này."}</p>
              <button type="button" disabled={!selected.id} onClick={() => void changeConversation(selected.id, { botEnabled: !selected.botEnabled, status: selected.botEnabled ? "handed_off" : "open", ...(selected.botEnabled ? { assignee: "Admin" } : {}) })} className={`mt-2 w-full rounded-lg border px-3 py-2 text-[10px] font-semibold ${selected.botEnabled ? "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"}`}>{selected.botEnabled ? "👤 Tiếp quản thủ công" : "Bật lại bot"}</button>
            </section>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <h3 className="mb-2 text-[10px] font-bold text-slate-500">PHÂN CÔNG</h3>
              <label className="mb-2 block text-[9px] text-slate-500">Nhân viên<select value={selected.assignee} onChange={(event) => void changeConversation(selected.id, { assignee: event.target.value })} className="inbox-surface inbox-border inbox-secondary-text mt-1 block h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10px]"><option>Chưa gán</option><option>Admin</option><option>Nhân viên bán hàng</option><option>Nhân viên hỗ trợ</option></select></label>
              <label className="mb-2 block text-[9px] text-slate-500">Đội<select value={selected.team} onChange={(event) => void changeConversation(selected.id, { team: event.target.value })} className="inbox-surface inbox-border inbox-secondary-text mt-1 block h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10px]"><option>Chưa phân công</option><option>Đội chăm sóc</option><option>Đội bán hàng</option></select></label>
              <label className="block text-[9px] text-slate-500">Mức độ ưu tiên<select value={selected.priority} onChange={(event) => void changeConversation(selected.id, { priority: event.target.value })} className="inbox-surface inbox-border inbox-secondary-text mt-1 block h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-[10px]"><option>Bình thường</option><option>Cao</option><option>Gấp</option></select></label>
            </section>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <div className="flex items-center justify-between"><h3 className="text-[11px] font-bold inbox-primary-text">Nhãn ({selected.labels.length})</h3><button type="button" onClick={() => setProfileLabelsOpen((open) => !open)} className="text-[9px] font-semibold text-[#2B54C3]">+ Gắn nhãn</button></div>
              <div className="mt-2 flex flex-wrap gap-1">{selected.labels.map((label) => <button key={label} type="button" onClick={() => void toggleConversationLabel(label)} className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">{label} ×</button>)}</div>
              {profileLabelsOpen && <div className="mt-2 rounded-xl border border-slate-200 p-1 dark:border-slate-700">{inboxLabels.map(({ name, color }) => <button key={name} type="button" onClick={() => void toggleConversationLabel(name)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800"><span className={`h-2 w-2 rounded-full ${color}`} />{name}{selected.labels.includes(name) && <Check className="ml-auto h-3 w-3 text-blue-600" />}</button>)}</div>}
            </section>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <label className="block text-[11px] font-bold inbox-primary-text">Ghi chú nội bộ</label>
              <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} onBlur={() => { if (noteDraft !== selected.notes.join("\n")) void saveNote(false); }} rows={3} maxLength={10000} placeholder="Khách mới từ quảng cáo." className="inbox-surface inbox-border inbox-secondary-text mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] outline-none focus:border-[#2B54C3]" />
              <p className="mt-1 text-[9px] text-slate-400">Tự động lưu khi bạn dừng gõ hoặc nhấp ra ngoài.</p>
              <button type="button" disabled={savingNote || !selected.contactId} onClick={() => void saveNote()} className="mt-2 text-[9px] font-semibold text-[#2B54C3] disabled:opacity-50">{savingNote ? "Đang lưu..." : "Lưu ngay"}</button>
            </section>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <h3 className="text-[11px] font-bold inbox-primary-text">Số dư</h3>
              <p className="mt-1 text-[17px] font-bold inbox-primary-text">{selected.balance.toLocaleString("vi-VN")} {balanceUnit}</p>
              <div className="mt-2 flex gap-2"><button type="button" onClick={async () => { if (!selected.contactId) return; const amount = Number(window.prompt(`Nhập số ${balanceUnit} thay đổi (có thể nhập số âm):`, "1000")); if (!Number.isFinite(amount)) return; const balance = Math.max(0, selected.balance + amount); try { await requestJson(`/api/contacts/${selected.contactId}`, "PATCH", { balance }); setConversations((items) => items.map((item) => item.id === selected.id ? { ...item, balance } : item)); showNotice("Đã cập nhật số dư."); } catch (error) { showNotice(error instanceof Error ? error.message : "Không thể cập nhật số dư."); } }} className="flex-1 rounded-lg bg-blue-50 px-2 py-2 text-[9px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200">💳 Cộng trừ</button><button type="button" onClick={() => showNotice("Chưa có biến động số dư.")} className="flex-1 rounded-lg bg-slate-100 px-2 py-2 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">🕒 Xem biến động</button></div>
            </section>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <h3 className="text-[11px] font-bold inbox-primary-text">Đơn hàng</h3>
              <div className="mt-2 flex gap-2"><a href={`/orders?contact=${encodeURIComponent(selected.contactId ?? "")}`} className="flex-1 rounded-lg bg-[#2B54C3] px-2 py-2 text-center text-[9px] font-semibold text-white">+ Tạo đơn hàng</a><a href="/orders" className="flex-1 rounded-lg bg-slate-100 px-2 py-2 text-center text-[9px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">📄 Quản lý đơn hàng</a></div>
              {selected.order && <p className="mt-2 text-[10px] text-slate-500">{selected.order} · gần đây</p>}
            </section>

            <details className="border-b border-[#F0F1F4] py-3 dark:border-slate-700"><summary className="cursor-pointer text-[10px] font-semibold inbox-primary-text">Lịch hẹn</summary><p className="mt-2 text-[10px] text-slate-500">Chưa có lịch hẹn.</p></details>
            <details className="border-b border-[#F0F1F4] py-3 dark:border-slate-700"><summary className="cursor-pointer text-[10px] font-semibold inbox-primary-text">Gói đăng ký</summary><p className="mt-2 text-[10px] text-slate-500">Chưa có gói đăng ký.</p></details>

            <section className="border-b border-[#F0F1F4] py-4 dark:border-slate-700">
              <div className="flex items-center justify-between"><h3 className="text-[11px] font-bold inbox-primary-text">Thông tin liên hệ</h3><a href="/contacts" className="text-[9px] font-semibold text-[#2B54C3]">✏️ Sửa</a></div>
              <div className="mt-2 space-y-2 text-[10px]"><p><span className="text-slate-400">Điện thoại:</span> <span className="inbox-secondary-text">{selected.phone || "Chưa cập nhật"}</span></p><p><span className="text-slate-400">Email:</span> <span className="inbox-secondary-text">{selected.email || "Chưa cập nhật"}</span></p><p><span className="text-slate-400">Kênh:</span> <span className="inbox-secondary-text">{selected.channelLabel}</span></p><p><span className="text-slate-400">Hoạt động:</span> <span className="inbox-secondary-text">{selected.activity || selected.date}</span></p><p><span className="text-slate-400">Địa chỉ:</span> <span className="inbox-secondary-text">{selected.address || "Chưa cập nhật"}</span></p></div>
            </section>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center text-[10px] leading-5 text-slate-400 dark:border-slate-700">🖼️ Hội thoại này chưa có hình ảnh nào. Hình ảnh trong cuộc hội thoại sẽ được tổng hợp tại đây.</div>
          </div>
        </aside>
        </div>
        </div>
      </div>

      <BottomNavigation activePath="/inbox" />

      {notice && <div role="status" className="fixed bottom-[82px] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#202638] px-4 py-2.5 text-xs font-medium text-white shadow-lg md:bottom-6">{notice}</div>}

      <NotificationDrawer
        open={notificationsOpen}
        notifications={notifications}
        unreadCount={unreadNotificationCount}
        onClose={() => setNotificationsOpen(false)}
        onReadAll={() => void updateNotification("", "all")}
        onRead={(id) => void updateNotification(id, "read")}
        onDelete={(id) => void updateNotification(id, "delete")}
      />

      <SearchCommandPalette
        open={searchOpen}
        conversations={conversations}
        contacts={conversations.map((conversation) => ({
          id: conversation.contactId ?? conversation.id,
          name: conversation.name,
          email: conversation.email,
          phone: conversation.phone,
        }))}
        onClose={() => setSearchOpen(false)}
        onOpenConversation={(id) => {
          setSelectedId(id);
          setDetailOpen(true);
          const item = conversations.find((conversation) => conversation.id === id);
          if (item) setNoteDraft(item.notes.join("\n"));
          if (item?.unread) void markConversationRead(id);
        }}
      />

      <MainNavigation
        mobile
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        darkMode={darkMode}
        receivingEnabled={receivingEnabled}
        onToggleDarkMode={toggleDarkMode}
        onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)}
      />

    </main>
  );
}
