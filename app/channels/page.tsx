"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Image,
  LayoutGrid,
  List,
  LockKeyhole,
  Menu,
  MessageCircle,
  MessagesSquare,
  Pencil,
  Paperclip,
  Power,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MainNavigation, { adminLinks, automationLinks, primaryLinks } from "@/components/main-navigation";
import NotificationDrawer, { type NotificationItem } from "@/components/notification-drawer";
import SearchCommandPalette from "@/components/search-command-palette";
import { useSettings } from "@/context/SettingsContext";

type Platform =
  | "zalo_personal"
  | "zalo_oa"
  | "telegram_personal"
  | "telegram_bot"
  | "facebook"
  | "instagram"
  | "chat_plugin"
  | "discord";
type Channel = {
  id: string;
  code: string;
  name: string;
  platform: Platform;
  status: string;
  authMode?: string;
  enabled: boolean;
  groupSync: boolean;
  groups: string[];
  externalAccountId: string | null;
  connectedAt: string | null;
  lastError: string | null;
  lastSignal: string | null;
  configurationReady: boolean;
  configurationMessage: string;
  settingsUrl: string;
  conversationCount: number;
  messageCount: number;
  createdAt: string;
};
type ViewMode = "grid" | "list";
type StatusFilter = "Tất cả" | "Hoạt động" | "Cần chú ý";
type SearchConversation = { id: string; name: string; preview: string; messages?: { id: string; content: string }[] };

const platforms: { id: Platform; label: string; short: string; description: string; className: string }[] = [
  { id: "zalo_personal", label: "Zalo cá nhân", short: "Z", description: "Tin nhắn tài khoản Zalo cá nhân", className: "bg-[#0877E8] text-white" },
  { id: "zalo_oa", label: "Zalo OA", short: "Z", description: "Tin nhắn từ Official Account", className: "bg-[#0877E8] text-white" },
  { id: "telegram_personal", label: "Telegram cá nhân", short: "➤", description: "Tin nhắn tài khoản Telegram", className: "bg-[#28A8E9] text-white" },
  { id: "telegram_bot", label: "Telegram Bot", short: "➤", description: "Tin nhắn qua Telegram Bot", className: "bg-[#28A8E9] text-white" },
  { id: "facebook", label: "Facebook", short: "f", description: "Tin nhắn Messenger của Fanpage", className: "bg-[#1877F2] text-white" },
  { id: "instagram", label: "Instagram", short: "◎", description: "Tin nhắn trực tiếp Instagram", className: "bg-gradient-to-br from-[#F9A13A] via-[#D94A83] to-[#7747C7] text-white" },
  { id: "chat_plugin", label: "Chat Plugin", short: "✦", description: "Khung chat trên website", className: "bg-[#6658D9] text-white" },
  { id: "discord", label: "Discord", short: "◉", description: "Tin nhắn từ máy chủ Discord", className: "bg-[#5865F2] text-white" },
];

const filterPlatforms = [
  { id: "all", label: "Tất cả" },
  { id: "facebook", label: "Facebook" },
  { id: "zalo_oa", label: "Zalo OA" },
  { id: "zalo_personal", label: "Zalo cá nhân" },
  { id: "telegram_bot", label: "Telegram Bot" },
  { id: "chat_plugin", label: "Chat Plugin" },
  { id: "instagram", label: "Instagram" },
  { id: "discord", label: "Discord" },
];

function platformInfo(id: string) {
  return platforms.find((platform) => platform.id === id) ?? platforms[0];
}

function PlatformLogo({ platform, size = "md" }: { platform: string; size?: "sm" | "md" | "lg" }) {
  const info = platformInfo(platform);
  const sizeClass = size === "lg" ? "h-12 w-12 rounded-2xl text-[22px]" : size === "sm" ? "h-8 w-8 rounded-xl text-sm" : "h-10 w-10 rounded-xl text-lg";
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center font-extrabold ${sizeClass} ${info.className}`}>{info.short}</span>;
}

function formatSignal(value: string | null) {
  if (!value) return "Chưa có tín hiệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có tín hiệu";
  return date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function ChannelsPage() {
  const { settings } = useSettings();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [desktopApp, setDesktopApp] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [receivingEnabled, setReceivingEnabled] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchConversations, setSearchConversations] = useState<SearchConversation[]>([]);
  const [appOrigin, setAppOrigin] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Tất cả");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("zalo_personal");
  const [channelName, setChannelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [groupDraft, setGroupDraft] = useState("");
  const hasChannelName = Boolean(channelName.trim());

  useEffect(() => {
    setDesktopApp(Boolean(window.electronAPI));
    const removeChannelAuthListener = window.electronAPI?.onChannelAuthenticated((payload) => {
      if (!payload.sessionDetected) return;
      showNotice("Đã phát hiện phiên đăng nhập trên cửa sổ kênh. Kết nối chính thức vẫn cần xác minh theo nền tảng.");
      void loadChannels();
    });
    const savedTheme = window.localStorage.getItem("chathub-theme");
    const useDarkMode = savedTheme === "dark";
    setAppOrigin(window.location.origin);
    setDarkMode(useDarkMode);
    document.documentElement.classList.toggle("dark", useDarkMode);
    void loadChannels();
    void loadNotifications();
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void loadChannels();
    };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    const params = new URLSearchParams(window.location.search);
    const connectResult = params.get("connect");
    if (connectResult) {
      const [result, channelId] = connectResult.split(":");
      const messages: Record<string, string> = {
        success: "Đã đăng nhập và xác thực tài khoản kênh.",
        "meta-setup": "Cần cấu hình App ID và App Secret tại Cài đặt → Kênh hoặc trong môi trường máy chủ.",
        "zalo-setup": "Cần cấu hình ZALO_OA_APP_ID và ZALO_OA_APP_SECRET trong môi trường máy chủ.",
        "discord-setup": "Cần cấu hình DISCORD_CLIENT_ID và DISCORD_BOT_TOKEN trong môi trường máy chủ.",
        "encryption-setup": "Cần cấu hình CHANNEL_CREDENTIALS_KEY trước khi lưu token bảo mật.",
        "base-url-setup": "Cần đặt CHANNELS_BASE_URL trùng với URL callback đã khai báo ở nhà cung cấp.",
        "state-invalid": "Phiên đăng nhập hết hạn hoặc không hợp lệ. Hãy thử kết nối lại.",
        cancelled: "Đăng nhập đã bị huỷ hoặc chưa cấp quyền.",
        failed: "Không thể hoàn tất đăng nhập. Hãy kiểm tra quyền ứng dụng và thử lại.",
        "not-found": "Không tìm thấy tài khoản kênh cần kết nối.",
        unsupported: "Nền tảng này không cung cấp API đăng nhập tài khoản cá nhân chính thức.",
        "configuration-error": "Cấu hình URL hoặc ứng dụng chưa hợp lệ.",
      };
      if (result === "telegram-token" && channelId) {
        setSelectedChannelId(channelId);
        showNotice("Nhập bot token do BotFather cấp để xác minh Telegram Bot.");
      } else if (result === "website-setup" && channelId) {
        setSelectedChannelId(channelId);
        showNotice("Chat Plugin không đăng nhập OAuth. Sao chép mã nhúng trong phần cấu hình kênh.");
      } else {
        showNotice(messages[result] ?? "Không thể khởi tạo đăng nhập nền tảng.");
        if (result === "success") void loadChannels();
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
    return () => {
      removeChannelAuthListener?.();
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, []);

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) ?? null;
  const unreadNotificationCount = notifications.filter((notification) => notification.unread).length;
  const counts = useMemo(() => ({
    all: channels.length,
    active: channels.filter((channel) => channel.enabled && (channel.status === "connected" || channel.configurationReady)).length,
    attention: channels.filter((channel) => !channel.enabled || (channel.status !== "connected" && !channel.configurationReady)).length,
  }), [channels]);
  const visibleChannels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return channels.filter((channel) => {
      const info = platformInfo(channel.platform);
      const matchesQuery = !normalizedQuery || `${channel.name} ${info.label} ${channel.code}`.toLocaleLowerCase("vi").includes(normalizedQuery);
      const matchesStatus = statusFilter === "Tất cả"
        || (statusFilter === "Hoạt động" ? channel.enabled && (channel.status === "connected" || channel.configurationReady) : !channel.enabled || (channel.status !== "connected" && !channel.configurationReady));
      const matchesPlatform = platformFilter === "all" || channel.platform === platformFilter;
      return matchesQuery && matchesStatus && matchesPlatform;
    });
  }, [channels, platformFilter, query, statusFilter]);

  async function loadChannels(showSpinner = false): Promise<boolean> {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch("/api/channels");
      const conversationResponse = await fetch("/api/inbox/conversations");
      const [data, conversationData] = await Promise.all([
        response.json().catch(() => ({})),
        conversationResponse.json().catch(() => ({})),
      ]);
      if (!response.ok || !conversationResponse.ok) {
        throw new Error(data.error ?? conversationData.error ?? `Không thể tải dữ liệu (HTTP ${!response.ok ? response.status : conversationResponse.status}).`);
      }
      setChannels(data.channels);
      setSearchConversations(conversationData.conversations);
      return true;
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể tải danh sách kênh.");
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không thể tải thông báo.");
      setNotifications(data.notifications);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể tải thông báo.");
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  async function requestJson(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Yêu cầu không thành công (HTTP ${response.status}).`);
    return data;
  }

  async function updateChannel(id: string, body: Record<string, unknown>) {
    try {
      const { channel } = await requestJson(`/api/channels/${id}`, "PATCH", body);
      setChannels((current) => current.map((item) => item.id === id ? { ...item, ...channel } : item));
      if ("name" in body) setEditingName(false);
      if ("groups" in body) setGroupDraft((body.groups as string[]).join(", "));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể cập nhật kênh.");
    }
  }

  async function createChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelName.trim() || saving) return;
    setSaving(true);
    try {
      const data = await requestJson("/api/channels", "POST", {
        name: channelName.trim(),
        platform: selectedPlatform,
      });
      const createdChannel = data.channel as Channel | undefined;
      if (!createdChannel || typeof createdChannel.id !== "string" || typeof createdChannel.name !== "string" || typeof createdChannel.platform !== "string") {
        throw new Error("Máy chủ đã nhận yêu cầu nhưng không trả về thông tin kênh hợp lệ.");
      }
      setChannels((current) => [...current.filter((channel) => channel.id !== createdChannel.id), createdChannel]);
      setAddOpen(false);
      setChannelName("");
      if (await loadChannels()) {
        showNotice("Đã thêm tài khoản. Hãy hoàn tất cấu hình để kết nối nền tảng.");
      }
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể tạo tài khoản kênh.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChannel(channel: Channel) {
    if (!window.confirm(`Xoá tài khoản "${channel.name}"? Hội thoại hiện có vẫn được giữ trong Hộp thư.`)) return;
    try {
      await window.electronAPI?.logoutChannelSession(channel.id);
      await requestJson(`/api/channels/${channel.id}`, "DELETE");
      setChannels((current) => current.filter((item) => item.id !== channel.id));
      setSelectedChannelId("");
      showNotice("Đã xoá tài khoản kênh.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể xoá tài khoản kênh.");
    }
  }

  function openDetails(channel: Channel) {
    setSelectedChannelId(channel.id);
    setNameDraft(channel.name);
    setGroupDraft(channel.groups.join(", "));
    setTelegramToken("");
    setEditingName(false);
  }

  function startConnect(channel: Channel) {
    if (channel.platform === "telegram_bot" || channel.platform === "chat_plugin") {
      openDetails(channel);
      return;
    }
    if (channel.platform === "zalo_personal" || channel.platform === "telegram_personal") {
      if (window.electronAPI) {
        void openDesktopChannelWindow(channel);
        return;
      }
      showNotice(channel.configurationMessage || "Tài khoản cá nhân chưa có luồng đăng nhập tin nhắn chính thức.");
      return;
    }
    if (channel.platform === "facebook" && window.electronAPI) {
      void openDesktopChannelWindow(channel);
      return;
    }
    if ((channel.platform === "facebook" || channel.platform === "instagram") && !channel.configurationReady) {
      showNotice("Hãy hoàn tất App ID và App Secret trong Cài đặt → Kênh trước khi đăng nhập.");
      window.location.assign(channel.settingsUrl || "/settings?tab=channels");
      return;
    }
    window.location.assign(`/api/channels/${encodeURIComponent(channel.id)}/connect`);
  }

  async function openDesktopChannelWindow(channel: Channel) {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.openChannelLoginWindow({ channelId: channel.id, provider: channel.platform });
      showNotice(`Đã mở cửa sổ ${platformInfo(channel.platform).label}. Đăng nhập sẽ chỉ được lưu trong phiên riêng của kênh.`);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể mở cửa sổ kênh.");
    }
  }

  async function connectTelegram(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChannel || !telegramToken.trim() || connectingTelegram) return;
    setConnectingTelegram(true);
    try {
      const result = await requestJson(`/api/channels/${selectedChannel.id}/connect`, "POST", { token: telegramToken.trim() });
      setTelegramToken("");
      await loadChannels();
      showNotice(result.username ? `Đã xác minh @${result.username}.` : "Đã xác minh Telegram Bot.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể xác minh Telegram Bot.");
    } finally {
      setConnectingTelegram(false);
    }
  }

  async function checkChannel(channel: Channel) {
    try {
      await requestJson(`/api/channels/${channel.id}/check`, "POST");
      await loadChannels();
      showNotice("Kết nối tài khoản đã được xác minh.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể kiểm tra kết nối.");
      await loadChannels();
    }
  }

  async function disconnectChannel(channel: Channel) {
    try {
      await window.electronAPI?.logoutChannelSession(channel.id);
      await requestJson(`/api/channels/${channel.id}/disconnect`, "POST");
      await loadChannels();
      showNotice("Đã xoá thông tin xác thực khỏi ChatHub.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Không thể ngắt kết nối.");
    }
  }

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("chathub-theme", next ? "dark" : "light");
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

  const tabClass = (selected: boolean) => `whitespace-nowrap border-b-2 px-1 pb-3 text-[12px] font-semibold transition ${selected ? "border-[#2B54C3] text-[#2B54C3]" : "border-transparent text-slate-500 hover:text-slate-800"}`;

  return (
    <main data-theme={darkMode ? "dark" : "light"} className={`flex h-[100dvh] flex-col overflow-hidden text-[#202638] ${darkMode ? "bg-[#0F131D]" : "bg-[#F5F6FA]"}`}>
      <header className="z-40 flex h-[58px] shrink-0 items-center justify-between bg-[#131722] px-3 text-white sm:px-5">
        <div className="flex w-1/3 items-center lg:hidden">
          <button type="button" aria-label={drawerOpen ? "Đóng điều hướng" : "Mở điều hướng"} aria-expanded={drawerOpen} onClick={() => setDrawerOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10">
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <h1 className="w-1/3 text-center text-[16px] font-bold lg:hidden">Kênh</h1>
        <div className="flex w-1/3 items-center justify-end gap-1 lg:hidden">
          <button type="button" aria-label="Tìm kiếm" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/10"><Search className="h-5 w-5" /></button>
        </div>
        <div className={`hidden h-full min-w-0 flex-1 items-center gap-5 ${settings.appearance?.menuLayout === "sidebar" ? "lg:hidden" : "lg:flex"}`}>
          <a href="/inbox" className="shrink-0 text-[14px] font-extrabold tracking-tight">{String(settings.general?.systemName ?? "ChatHub")}</a>
          <nav aria-label="Điều hướng chính" className="flex min-w-0 flex-1 items-center gap-1">
            {primaryLinks.map(({ label, href, icon: Icon, badge }) => (
              <a key={href} href={href} className="flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10">
                <Icon className="h-4 w-4" />{label}{badge && <span className="rounded-full bg-[#2B54C3] px-1.5 py-0.5 text-[9px] text-white">{badge}</span>}
              </a>
            ))}
            {([
              ["automation", "Tự động hoá", automationLinks],
              ["admin", "Quản trị", adminLinks],
            ] as const).map(([key, label, links]) => (
              <details key={key} className="relative">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10">{label}<ChevronRight className="h-3 w-3 rotate-90" /></summary>
                <div className="absolute left-0 top-10 z-50 w-48 rounded-xl border border-slate-700 bg-[#1B2230] p-1.5 shadow-xl">
                  {links.map(({ label: itemLabel, href: itemHref, icon: ItemIcon }) => <a key={itemHref} href={itemHref} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-white/10 ${itemHref === "/channels" ? "text-blue-300" : "text-slate-200"}`}><ItemIcon className="h-4 w-4" />{itemLabel}</a>)}
                </div>
              </details>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" role="switch" aria-checked={receivingEnabled} aria-label="Nhận hội thoại mới" onClick={() => setReceivingEnabled((enabled) => !enabled)} className={`relative h-[18px] w-8 rounded-full transition ${receivingEnabled ? "bg-emerald-500" : "bg-slate-600"}`}><span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition ${receivingEnabled ? "left-[16px]" : "left-[2px]"}`} /></button>
            <button type="button" aria-label="Tìm kiếm" onClick={() => setSearchOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><Search className="h-[18px] w-[18px]" /></button>
            <button type="button" aria-label="Thông báo" onClick={() => setNotificationOpen(true)} className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10"><Activity className="h-[18px] w-[18px]" />{unreadNotificationCount > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px]">{unreadNotificationCount}</span>}</button>
            <button type="button" aria-label="Chuyển giao diện" onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"><Settings2 className="h-[18px] w-[18px]" /></button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <MainNavigation activePath="/channels" darkMode={darkMode} receivingEnabled={receivingEnabled} onToggleDarkMode={toggleTheme} onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)} />
        <div className="min-w-0 flex-1 overflow-y-auto">
          <section className="mx-auto max-w-[1440px] px-4 pb-8 pt-5 sm:px-6 lg:px-8 lg:pt-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">Quản trị <ChevronRight className="inline h-3 w-3" /> Kênh</p>
                <h2 className="mt-1 text-[23px] font-bold tracking-tight text-slate-900">Kênh kết nối</h2>
                <p className="mt-1 text-[12px] text-slate-500">Quản lý các tài khoản và theo dõi hội thoại từ từng nền tảng.</p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <button type="button" onClick={() => void loadChannels(true)} disabled={refreshing} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 sm:flex-none">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Làm mới
                </button>
                <button type="button" onClick={() => setAddOpen(true)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2B54C3] px-4 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#2448A8] sm:flex-none">
                  <Plus className="h-4 w-4" /> Thêm tài khoản
                </button>
              </div>
            </div>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-[#FAFBFD] px-3 text-slate-400 focus-within:border-[#8DA6E8] focus-within:ring-2 focus-within:ring-[#2B54C3]/10">
                <Search className="h-[17px] w-[17px] shrink-0" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc loại kênh..." className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-700 outline-none placeholder:text-slate-400" />
                {query && <button type="button" aria-label="Xoá tìm kiếm" onClick={() => setQuery("")}><X className="h-4 w-4" /></button>}
              </label>
              <div className="mt-4 flex gap-6 border-b border-slate-100">
                {([
                  ["Tất cả", counts.all],
                  ["Hoạt động", counts.active],
                  ["Cần chú ý", counts.attention],
                ] as const).map(([label, count]) => (
                  <button type="button" key={label} onClick={() => setStatusFilter(label)} className={tabClass(statusFilter === label)}>{label}<span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${statusFilter === label ? "bg-[#EAF0FF] text-[#2B54C3]" : "bg-slate-100 text-slate-500"}`}>{count}</span></button>
                ))}
              </div>
              <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filterPlatforms.map((platform) => (
                  <button type="button" key={platform.id} onClick={() => setPlatformFilter(platform.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${platformFilter === platform.id ? "bg-[#EAF0FF] text-[#2B54C3]" : "bg-[#F5F6F9] text-slate-600 hover:bg-slate-100"}`}>{platform.label}</button>
                ))}
              </div>
            </section>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-[13px] font-bold text-slate-800">{visibleChannels.length} kênh</p>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button type="button" aria-label="Dạng thẻ lưới" aria-pressed={viewMode === "grid"} onClick={() => setViewMode("grid")} className={`flex h-8 w-9 items-center justify-center rounded-lg ${viewMode === "grid" ? "bg-[#EAF0FF] text-[#2B54C3]" : "text-slate-500 hover:bg-slate-50"}`}><LayoutGrid className="h-4 w-4" /></button>
                <button type="button" aria-label="Dạng danh sách" aria-pressed={viewMode === "list"} onClick={() => setViewMode("list")} className={`flex h-8 w-9 items-center justify-center rounded-lg ${viewMode === "list" ? "bg-[#EAF0FF] text-[#2B54C3]" : "text-slate-500 hover:bg-slate-50"}`}><List className="h-4 w-4" /></button>
              </div>
            </div>

            {loading ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
              </div>
            ) : visibleChannels.length ? (
              <div className={`mt-4 ${viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3"}`}>
                {visibleChannels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} compact={viewMode === "list"} desktopApp={desktopApp} onOpen={() => openDetails(channel)} onConnect={() => startConnect(channel)} onOpenSession={() => void openDesktopChannelWindow(channel)} onToggle={() => void updateChannel(channel.id, { enabled: !channel.enabled })} onDelete={() => void deleteChannel(channel)} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
                <MessagesSquare className="mx-auto h-9 w-9 text-slate-300" />
                <h3 className="mt-3 text-[14px] font-bold text-slate-800">{channels.length ? "Không tìm thấy kênh phù hợp" : "Chưa có tài khoản kênh"}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{channels.length ? "Thử đổi từ khoá hoặc bộ lọc." : "Thêm tài khoản để quản lý hội thoại theo từng nền tảng."}</p>
                {!channels.length && <button type="button" onClick={() => setAddOpen(true)} className="mt-4 rounded-xl bg-[#2B54C3] px-4 py-2.5 text-[11px] font-bold text-white">Thêm tài khoản</button>}
              </div>
            )}
          </section>
        </div>
      </div>

      <BottomNavigation activePath="/channels" />
      <MainNavigation mobile open={drawerOpen} onClose={() => setDrawerOpen(false)} activePath="/channels" darkMode={darkMode} receivingEnabled={receivingEnabled} onToggleDarkMode={toggleTheme} onToggleReceiving={() => setReceivingEnabled((enabled) => !enabled)} />

      {addOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setAddOpen(false); }}>
          <form onSubmit={createChannel} className="flex max-h-[92dvh] w-full max-w-[570px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div><h2 className="text-[17px] font-bold text-slate-900">Thêm tài khoản</h2><p className="mt-1 text-[11px] text-slate-500">Chọn loại kênh và chuẩn bị thông tin kết nối.</p></div>
              <button type="button" aria-label="Đóng" onClick={() => setAddOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <section>
                <h3 className="mb-2 text-[10px] font-extrabold tracking-[0.12em] text-slate-500">LOẠI KÊNH</h3>
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((platform) => (
                    <button type="button" key={platform.id} onClick={() => setSelectedPlatform(platform.id)} className={`flex min-h-[58px] items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${selectedPlatform === platform.id ? "border-[#2B54C3] bg-[#F3F6FF] ring-1 ring-[#2B54C3]/10" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                      <PlatformLogo platform={platform.id} size="sm" />
                      <span className="min-w-0"><span className="block truncate text-[11px] font-bold text-slate-800">{platform.label}</span><span className="mt-0.5 block truncate text-[9px] text-slate-500">{platform.description}</span></span>
                      {selectedPlatform === platform.id && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-[#2B54C3]" />}
                    </button>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-[#DDE6FA] bg-[#F6F8FE] p-3.5">
                <h3 className="text-[9px] font-extrabold tracking-[0.12em] text-[#53668F]">KÊNH ĐÃ CHỌN</h3>
                <div className="mt-2 flex items-start gap-2.5">
                  <PlatformLogo platform={selectedPlatform} size="sm" />
                  <p className="text-[11px] leading-5 text-slate-600"><span className="font-bold text-slate-800">Thiết lập {platformInfo(selectedPlatform).label}</span> - Kết nối tài khoản {platformInfo(selectedPlatform).label} để nhận và trả lời tin nhắn ngay trong Tin nhắn.</p>
                </div>
              </section>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-700">Tên kênh <span className="text-rose-500">*</span></span>
                <input required maxLength={100} value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="Ví dụ: Fanpage Chính" className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#8DA6E8] focus:ring-2 focus:ring-[#2B54C3]/10" />
                <span className="mt-1 block text-[10px] text-slate-500">Đặt tên giúp bạn phân biệt các tài khoản cùng nền tảng.</span>
              </label>
              {selectedPlatform === "zalo_personal" && hasChannelName && (
                <section className={`rounded-xl border p-4 ${desktopApp ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <h3 className={`text-[11px] font-bold ${desktopApp ? "text-emerald-900" : "text-amber-900"}`}>Zalo cá nhân {desktopApp ? "qua phiên Desktop" : "trên ứng dụng Web"}</h3>
                  <p className={`mt-1 text-[10px] leading-4 ${desktopApp ? "text-emerald-800" : "text-amber-800"}`}>{desktopApp ? "Cửa sổ đăng nhập Zalo Web sẽ dùng partition riêng cho tài khoản này. Bấm Tạo tài khoản rồi mở cửa sổ kênh để quét QR." : "Phiên Zalo cá nhân chỉ được mở trong ứng dụng Desktop để cô lập cookie và bộ nhớ. Phiên Web không truy cập hay xác thực tài khoản cá nhân."}</p>
                </section>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5 sm:px-6">
              <button type="button" onClick={() => setAddOpen(false)} disabled={saving} className="h-9 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Huỷ</button>
              <button type="submit" disabled={!channelName.trim() || saving} className="flex h-9 items-center gap-2 rounded-xl bg-[#2B54C3] px-4 text-[11px] font-bold text-white hover:bg-[#2448A8] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Tạo tài khoản</button>
            </footer>
          </form>
        </div>
      )}

      {selectedChannel && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedChannelId(""); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="channel-detail-title" className="flex max-h-[94dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <PlatformLogo platform={selectedChannel.platform} />
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="channel-detail-title" className="truncate text-[15px] font-bold text-slate-900">{selectedChannel.name}</h2><StatusBadge channel={selectedChannel} /></div><p className="mt-0.5 text-[10px] text-slate-500">{platformInfo(selectedChannel.platform).label} · {selectedChannel.code}</p></div>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setSelectedChannelId("")} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
              <section className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-[#FAFBFD] p-3.5">
                <div><p className="text-[12px] font-bold text-slate-800">Kênh đang bật</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Tin nhắn của kênh này về hộp thư và gửi đi bình thường.</p></div>
                <Toggle checked={selectedChannel.enabled} label="Bật kênh" onChange={(enabled) => void updateChannel(selectedChannel.id, { enabled })} />
              </section>

              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => startConnect(selectedChannel)} className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5" />Kết nối lại</button>
                <button type="button" onClick={() => void checkChannel(selectedChannel)} className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><Activity className="h-3.5 w-3.5" />Kiểm tra</button>
                <button type="button" onClick={() => void disconnectChannel(selectedChannel)} className="flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[10px] font-semibold text-rose-600 hover:bg-rose-100"><PowerIcon />Ngắt kết nối</button>
              </div>

              {["facebook", "instagram", "telegram_personal"].includes(selectedChannel.platform) && (
                <section className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${selectedChannel.configurationReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                  <div className="flex gap-2"><Settings2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /><div><p className="text-[10px] font-bold">{selectedChannel.configurationReady ? "Cấu hình chung đã sẵn sàng" : "Chưa đủ cấu hình chung"}</p><p className="mt-1 text-[10px] leading-4">{selectedChannel.configurationMessage}</p></div></div>
                  <a href={selectedChannel.settingsUrl || "/settings?tab=channels"} className="shrink-0 text-[10px] font-bold underline underline-offset-2">Mở Cài đặt</a>
                </section>
              )}

              <section>
                <SectionLabel>TÊN KÊNH</SectionLabel>
                <div className="mt-2 flex items-center gap-2">
                  {editingName ? <input autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={100} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-[#8DA6E8]" /> : <p className="min-w-0 flex-1 text-[12px] font-semibold text-slate-800">{selectedChannel.name}</p>}
                  {editingName ? <button type="button" onClick={() => void updateChannel(selectedChannel.id, { name: nameDraft })} className="text-[10px] font-bold text-[#2B54C3]">Lưu</button> : <button type="button" onClick={() => { setNameDraft(selectedChannel.name); setEditingName(true); }} className="flex items-center gap-1 text-[10px] font-semibold text-[#2B54C3]"><Pencil className="h-3 w-3" />Sửa</button>}
                </div>
              </section>

              <section>
                <SectionLabel>THÔNG TIN</SectionLabel>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <InfoCell label="Mã tài khoản" value={selectedChannel.code} monospace />
                  <InfoCell label="Mã hoá phiên" value="AES-256-GCM" icon={<LockKeyhole className="h-3 w-3 text-emerald-600" />} />
                  <InfoCell label="Tín hiệu cuối" value={formatSignal(selectedChannel.lastSignal)} />
                  <a href={`/inbox?channel=${encodeURIComponent(selectedChannel.id)}`} onClick={() => setSelectedChannelId("")} className="rounded-xl border border-[#DDE6FA] bg-[#F6F8FE] p-3 transition hover:border-[#9DB2EA]">
                    <span className="block text-[9px] font-medium text-slate-500">Dữ liệu</span><span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#2B54C3]">{selectedChannel.conversationCount} hội thoại · {selectedChannel.messageCount} tin nhắn<ArrowUpRight className="h-3 w-3" /></span>
                  </a>
                </div>
              </section>

              <section>
                <SectionLabel>ĐỒNG BỘ TIN NHẮN</SectionLabel>
                <div className="mt-2 rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-[11px] font-semibold text-slate-800">Đồng bộ tin nhắn nhóm</p><p className="mt-0.5 text-[9px] text-slate-500">Áp dụng khi tài khoản nền tảng hỗ trợ nhóm.</p></div>
                    <Toggle checked={selectedChannel.groupSync} label="Đồng bộ tin nhắn nhóm" onChange={(groupSync) => void updateChannel(selectedChannel.id, { groupSync })} />
                  </div>
                  <label className="mt-3 block text-[10px] font-semibold text-slate-600">Nhóm cụ thể
                    <input value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onBlur={() => void updateChannel(selectedChannel.id, { groups: groupDraft.split(",").map((group) => group.trim()).filter(Boolean) })} placeholder="Nhập tên nhóm, phân tách bằng dấu phẩy" className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-[10px] font-normal outline-none placeholder:text-slate-400 focus:border-[#8DA6E8]" />
                  </label>
                </div>
              </section>

              <section>
                <SectionLabel>KHẢ NĂNG HỖ TRỢ</SectionLabel>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Capability icon={<Image className="h-4 w-4" />} title="Gửi ảnh" />
                  <Capability icon={<Paperclip className="h-4 w-4" />} title="Gửi file" />
                  <Capability icon={<MessageCircle className="h-4 w-4" />} title="Trả lời tự động" />
                </div>
              </section>

              {selectedChannel.status !== "connected" && (
                <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-bold">{selectedChannel.configurationReady ? "Cấu hình nền tảng đã sẵn sàng" : "Cần cấu hình kết nối"}</p><p className="mt-1 text-[10px] leading-4">{selectedChannel.lastError || selectedChannel.configurationMessage || "Đăng nhập nền tảng để xác thực tài khoản."}</p>
                    {["facebook", "instagram", "telegram_personal"].includes(selectedChannel.platform) && <a href={selectedChannel.settingsUrl || "/settings?tab=channels"} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline"><Settings2 className="h-3 w-3" />Mở Cài đặt Kênh</a>}
                  </div>
                </div>
              )}
              {selectedChannel.platform === "telegram_bot" && (
                <section className="rounded-xl border border-slate-200 p-3.5">
                  <SectionLabel>ĐĂNG NHẬP TELEGRAM BOT</SectionLabel>
                  <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Tạo bot với BotFather rồi nhập token. Token được xác minh qua Telegram và mã hoá trước khi lưu.</p>
                  <form onSubmit={connectTelegram} className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input type="password" autoComplete="new-password" value={telegramToken} onChange={(event) => setTelegramToken(event.target.value)} placeholder="Bot token từ BotFather" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-[#8DA6E8]" />
                    <button type="submit" disabled={!telegramToken.trim() || connectingTelegram} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#2B54C3] px-3 text-[10px] font-bold text-white disabled:opacity-50">{connectingTelegram ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Xác minh Bot</button>
                  </form>
                </section>
              )}
              {["facebook", "instagram", "zalo_oa", "discord"].includes(selectedChannel.platform) && (
                <section className="rounded-xl border border-slate-200 p-3.5">
                  <SectionLabel>ĐĂNG NHẬP NỀN TẢNG</SectionLabel>
                  <p className="mt-1.5 text-[10px] leading-4 text-slate-500">{oauthSetupHint(selectedChannel.platform)}</p>
                  <button type="button" onClick={() => startConnect(selectedChannel)} className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg bg-[#2B54C3] px-3 text-[10px] font-bold text-white hover:bg-[#2448A8]"><ArrowUpRight className="h-3.5 w-3.5" />Đăng nhập {platformInfo(selectedChannel.platform).label}</button>
                </section>
              )}
              {selectedChannel.platform === "chat_plugin" && (
                <WebsiteInstallPanel channelId={selectedChannel.id} appOrigin={appOrigin} onNotice={showNotice} />
              )}
              {(selectedChannel.platform === "zalo_personal" || selectedChannel.platform === "telegram_personal") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-800">
                  {platformInfo(selectedChannel.platform).label} không cung cấp API chính thức để ứng dụng này đăng nhập và đồng bộ tin nhắn cá nhân an toàn. Hãy dùng Zalo OA hoặc Telegram Bot.
                </div>
              )}
              {selectedChannel.status === "connected" && selectedChannel.platform !== "chat_plugin" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[10px] leading-4 text-blue-800">
                  Tài khoản đã xác thực. Để nhận và gửi tin nhắn thực tế, hãy đăng ký webhook và cấp quyền nhắn tin trong bảng điều khiển của nhà cung cấp.
                </div>
              )}
            </div>
            <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 sm:px-6">
              <button type="button" onClick={() => void deleteChannel(selectedChannel)} className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Xoá tài khoản</button>
              <button type="button" onClick={() => setSelectedChannelId("")} className="h-9 rounded-xl border border-slate-200 px-4 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Đóng</button>
            </footer>
          </section>
        </div>
      )}

      {notice && <div role="status" className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-[11px] font-medium text-white shadow-lg sm:bottom-5">{notice}</div>}
      <NotificationDrawer
        open={notificationOpen}
        notifications={notifications}
        unreadCount={unreadNotificationCount}
        onClose={() => setNotificationOpen(false)}
        onReadAll={() => void updateNotification("", "all")}
        onRead={(id) => void updateNotification(id, "read")}
        onDelete={(id) => void updateNotification(id, "delete")}
      />
      <SearchCommandPalette
        open={searchOpen}
        conversations={searchConversations}
        onClose={() => setSearchOpen(false)}
        onOpenConversation={(id) => { setSearchOpen(false); window.location.href = `/inbox?conversation=${encodeURIComponent(id)}`; }}
      />
    </main>
  );
}

function ChannelCard({ channel, compact, desktopApp, onOpen, onConnect, onOpenSession, onToggle, onDelete }: { channel: Channel; compact: boolean; desktopApp: boolean; onOpen: () => void; onConnect: () => void; onOpenSession: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md ${compact ? "flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap sm:px-4" : "p-4"}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PlatformLogo platform={channel.platform} size={compact ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-bold text-slate-900">{channel.name}</h3>
          <p className="mt-0.5 truncate text-[10px] text-slate-500">{platformInfo(channel.platform).label} · {platformInfo(channel.platform).description}</p>
        </div>
        <Toggle checked={channel.enabled} label={`Bật nhận tin nhắn từ ${channel.name}`} onChange={onToggle} />
      </div>
      <div className={`flex min-w-0 items-center gap-2 ${compact ? "sm:w-[190px]" : "mt-3"}`}>
        <StatusBadge channel={channel} />
        {channel.status !== "connected" && <span className={`truncate text-[9px] ${channel.configurationReady ? "text-emerald-700" : "text-amber-700"}`}>{channel.configurationReady ? "Cấu hình sẵn sàng" : "Cần cấu hình"}</span>}
      </div>
      {!compact && channel.status !== "connected" && <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[9px] leading-4 text-amber-800">{channel.lastError || channel.configurationMessage || "Cần đăng nhập hoặc cấu hình tài khoản để kết nối nền tảng."}</p>}
      <div className={`flex items-center gap-2 border-t border-slate-100 pt-3 ${compact ? "ml-auto w-full sm:ml-0 sm:w-auto sm:border-0 sm:pt-0" : "mt-3"}`}>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[9px] text-slate-500"><Activity className="h-3.5 w-3.5 shrink-0 text-slate-400" />Tín hiệu cuối: {formatSignal(channel.lastSignal)}</span>
        <button type="button" aria-label={`Xoá ${channel.name}`} onClick={onDelete} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
        {channel.status !== "connected" && <button type="button" onClick={onConnect} className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-800">Đăng nhập</button>}
        {desktopApp && ["zalo_personal", "facebook", "telegram_personal"].includes(channel.platform) && <button type="button" onClick={onOpenSession} className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-emerald-700 hover:text-emerald-800">Mở cửa sổ kênh</button>}
        <button type="button" onClick={onOpen} className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-[#2B54C3] hover:text-[#173B9A]">Mở cấu hình <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </article>
  );
}

function StatusBadge({ channel }: { channel: Channel }) {
  if (!channel.enabled) return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Đã tắt</span>;
  if (channel.status === "connected") return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{channel.platform === "chat_plugin" ? "Đang hoạt động" : "Đã đăng nhập"}</span>;
  if (channel.configurationReady) return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Sẵn sàng kết nối</span>;
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-50 px-2 py-1 text-[9px] font-semibold text-rose-600"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Cần cấu hình / Lỗi</span>;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-label={label} aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-[21px] w-[38px] shrink-0 rounded-full transition ${checked ? "bg-[#20B47A]" : "bg-slate-300"}`}>
      <span className={`absolute top-[3px] h-[15px] w-[15px] rounded-full bg-white shadow-sm transition ${checked ? "left-[20px]" : "left-[3px]"}`} />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[9px] font-extrabold tracking-[0.12em] text-slate-500">{children}</h3>;
}

function InfoCell({ label, value, monospace = false, icon }: { label: string; value: string; monospace?: boolean; icon?: React.ReactNode }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 p-3"><span className="block text-[9px] font-medium text-slate-500">{label}</span><span className={`mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-800 ${monospace ? "font-mono" : ""}`}>{icon}{value}</span></div>;
}

function Capability({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2.5 py-3 text-[9px] font-semibold text-slate-600">{icon}<span className="truncate">{title}</span></div>;
}

function oauthSetupHint(platform: string) {
  if (platform === "facebook" || platform === "instagram") {
    return "Đăng nhập Meta để cấp quyền Trang. Cấu hình App ID và App Secret tại Cài đặt → Kênh; URL callback được hiển thị tại đó.";
  }
  if (platform === "zalo_oa") {
    return "Đăng nhập bằng tài khoản quản trị OA. Cần ZALO_OA_APP_ID, ZALO_OA_APP_SECRET và URL callback đã khai báo trong Zalo Developers.";
  }
  return "Mở Discord để mời Bot vào máy chủ. Cần DISCORD_CLIENT_ID và DISCORD_BOT_TOKEN trên máy chủ ChatHub.";
}

function WebsiteInstallPanel({ channelId, appOrigin, onNotice }: { channelId: string; appOrigin: string; onNotice: (message: string) => void }) {
  const widgetUrl = appOrigin ? `${appOrigin}/widget/${encodeURIComponent(channelId)}` : "";
  const snippet = widgetUrl
    ? `<iframe src="${widgetUrl}" title="Chat với chúng tôi" width="400" height="680" style="position:fixed;right:0;bottom:0;width:min(400px,100vw);height:min(680px,100vh);border:0;z-index:9999;background:transparent" loading="lazy"></iframe>`
    : "Đang chuẩn bị mã nhúng...";
  return (
    <section className="rounded-xl border border-slate-200 p-3.5">
      <SectionLabel>CÀI ĐẶT CHAT PLUGIN</SectionLabel>
      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Chat Plugin không cần đăng nhập OAuth. Thêm mã nhúng sau vào website; khách chat sẽ tạo hội thoại riêng trong Hộp thư.</p>
      <textarea readOnly value={snippet} rows={3} className="mt-3 w-full resize-none rounded-lg bg-slate-950 p-3 font-mono text-[9px] leading-4 text-slate-100 outline-none" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <a href={widgetUrl || "/"} target="_blank" rel="noreferrer" className="text-[9px] font-semibold text-[#2B54C3]">Xem trước tiện ích chat</a>
        <button type="button" disabled={!widgetUrl} onClick={() => {
          void navigator.clipboard.writeText(snippet).then(
            () => onNotice("Đã sao chép mã nhúng Chat Plugin."),
            () => onNotice("Không thể sao chép tự động. Hãy chọn và sao chép mã trong ô."),
          );
        }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[9px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Sao chép mã</button>
      </div>
    </section>
  );
}

function PowerIcon() {
  return <Power className="h-3.5 w-3.5" />;
}
