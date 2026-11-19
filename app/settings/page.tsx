"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Clipboard,
  Clock,
  CreditCard,
  ExternalLink,
  HardDrive,
  Languages,
  LockKeyhole,
  Mail,
  Menu,
  Palette,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Send,
  Save,
  Server,
  Settings,
  Shield,
  Sparkles,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/bottom-navigation";
import MainNavigation from "@/components/main-navigation";
import TopbarNavigation from "@/components/topbar-navigation";
import { useSettings } from "@/context/SettingsContext";
import {
  genericSettingsFields,
  settingsTabs,
  type SettingsFieldDefinition,
  type SettingsTabId,
} from "@/lib/settings-definitions";

type SettingsValues = Record<SettingsTabId, Record<string, unknown>>;
type Notice = { type: "success" | "error"; message: string } | null;
type ColorKey = "accent" | "brand" | "page" | "card" | "text" | "success" | "warning" | "danger" | "info";
type AiProviderSettings = { provider: string; baseUrl: string; modelName: string; embeddingModel: string; isEnabled: boolean; hasApiKey: boolean };

const generalDefaults = {
  systemName: "ChatHub",
  timezone: "Asia/Ho_Chi_Minh",
  language: "Tiếng Việt",
  defaultConversationStatus: "Đang mở",
  afterHoursMessage: "",
  balanceLabel: "Credits",
};

const defaultColors: Record<ColorKey, string> = {
  accent: "#3659c9",
  brand: "#101a32",
  page: "#f6f7fa",
  card: "#ffffff",
  text: "#111827",
  success: "#16794f",
  warning: "#9a640c",
  danger: "#bd3344",
  info: "#176b87",
};

const palettes: { name: string; colors: Record<ColorKey, string> }[] = [
  { name: "Mặc định", colors: defaultColors },
  { name: "Đại dương", colors: { accent: "#176b87", brand: "#12344a", page: "#f2f8fb", card: "#ffffff", text: "#102a3a", success: "#16794f", warning: "#9a640c", danger: "#bd3344", info: "#176b87" } },
  { name: "Rừng", colors: { accent: "#32724f", brand: "#17382c", page: "#f3f8f4", card: "#ffffff", text: "#172a20", success: "#16794f", warning: "#9a640c", danger: "#bd3344", info: "#176b87" } },
  { name: "Tím", colors: { accent: "#7651b5", brand: "#30204e", page: "#f7f4fb", card: "#ffffff", text: "#241b32", success: "#16794f", warning: "#9a640c", danger: "#bd3344", info: "#176b87" } },
  { name: "Hoàng hôn", colors: { accent: "#c6653d", brand: "#472c30", page: "#fbf5f1", card: "#ffffff", text: "#30201d", success: "#16794f", warning: "#9a640c", danger: "#bd3344", info: "#176b87" } },
  { name: "Hồng", colors: { accent: "#c24e76", brand: "#45243b", page: "#fcf4f7", card: "#ffffff", text: "#301d29", success: "#16794f", warning: "#9a640c", danger: "#bd3344", info: "#176b87" } },
  { name: "Than chì", colors: { accent: "#48566b", brand: "#242d3b", page: "#f3f4f6", card: "#ffffff", text: "#18202c", success: "#16794f", warning: "#9a640c", danger: "#bd3344", info: "#176b87" } },
];

const colorLabels: Record<ColorKey, string> = {
  accent: "Màu nhấn",
  brand: "Khối thương hiệu",
  page: "Nền trang",
  card: "Nền thẻ",
  text: "Màu chữ",
  success: "Thành công",
  warning: "Cảnh báo",
  danger: "Nguy hiểm",
  info: "Thông tin",
};

const defaultAppearance = {
  menuLayout: "topbar",
  colorMode: "light",
  colorPalette: "Mặc định",
  colorDescription: "",
  colors: defaultColors,
};

const defaultAiSettings: AiProviderSettings = {
  provider: "openai",
  baseUrl: "",
  modelName: "gpt-4o-mini",
  embeddingModel: "text-embedding-3-small",
  isEnabled: false,
  hasApiKey: false,
};

const settingsTabIcons: Record<SettingsTabId, typeof Settings> = {
  general: Settings,
  appearance: Palette,
  channels: Send,
  payments: CreditCard,
  email: Mail,
  "telegram-notifications": Bot,
  "ai-provider": Sparkles,
  translation: Languages,
  "custom-fields": Tags,
  "business-hours": Clock,
  "file-storage": HardDrive,
  "data-cleanup": Trash2,
  permissions: Shield,
  system: Server,
  "error-logs": AlertCircle,
  updates: RefreshCw,
  addons: Puzzle,
};

function makeDefaultValues(): SettingsValues {
  const values = {} as SettingsValues;
  for (const { id } of settingsTabs) {
    if (id === "general") values[id] = { ...generalDefaults };
    else if (id === "appearance") values[id] = { ...defaultAppearance, colors: { ...defaultColors } };
    else if (id === "channels") values[id] = { telegramApiId: "", facebookAppId: "" };
    else {
      values[id] = Object.fromEntries(
        (genericSettingsFields[id] ?? [])
          .filter((field) => !field.secret)
          .map((field) => [field.key, field.defaultValue ?? (field.type === "toggle" ? false : "")]),
      );
    }
  }
  return values;
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function makeVerifyToken() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Yêu cầu không thành công.") as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

function Field({
  field,
  value,
  onChange,
  configured = false,
}: {
  field: SettingsFieldDefinition;
  value: unknown;
  onChange: (value: string | number | boolean) => void;
  configured?: boolean;
}) {
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  if (field.type === "toggle") {
    return (
      <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <button type="button" role="switch" aria-checked={Boolean(value)} onClick={() => onChange(!value)} className={`relative h-6 w-11 rounded-full transition ${value ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${value ? "left-6" : "left-1"}`} />
        </button>
      </label>
    );
  }
  return (
    <label className="block text-sm font-medium text-slate-700">
      {field.label}
      {field.type === "textarea" ? (
        <textarea className={`${inputClass} min-h-24 resize-y`} placeholder={field.placeholder} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
      ) : field.type === "select" ? (
        <select className={inputClass} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          className={inputClass}
          type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
          autoComplete={field.secret ? "new-password" : undefined}
          placeholder={configured && field.secret ? "Đã lưu · nhập giá trị mới để thay đổi" : field.placeholder}
          value={field.secret && !value ? "" : String(value ?? "")}
          onChange={(event) => onChange(field.type === "number" ? Number(event.target.value) : event.target.value)}
        />
      )}
      {field.help && <span className="mt-1 block text-xs font-normal text-slate-500">{field.help}</span>}
    </label>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const systemName = String(settings.general?.systemName ?? "ChatHub");
  const [activeTab, setActiveTab] = useState<SettingsTabId>("general");
  const [values, setValues] = useState<SettingsValues>(makeDefaultValues);
  const [savedValues, setSavedValues] = useState<SettingsValues>(makeDefaultValues);
  const [configuredSecrets, setConfiguredSecrets] = useState<Record<string, boolean>>({});
  const [aiSettings, setAiSettings] = useState<AiProviderSettings>(defaultAiSettings);
  const [savedAiSettings, setSavedAiSettings] = useState<AiProviderSettings>(defaultAiSettings);
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiSettingsLoaded, setAiSettingsLoaded] = useState(false);
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [visibleVerifyToken, setVisibleVerifyToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState("");
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const requestedTabInfo = settingsTabs.find((tab) => tab.id === requestedTab);
    if (requestedTabInfo) setActiveTab(requestedTabInfo.id);
    const savedTheme = window.localStorage.getItem("chathub-theme");
    setDarkTheme(savedTheme === "dark");
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    fetch("/api/system-settings")
      .then(responseJson)
      .then((data) => {
        const defaults = makeDefaultValues();
        const merged = { ...defaults } as SettingsValues;
        for (const { id } of settingsTabs) {
          if (data.settings?.[id] && typeof data.settings[id] === "object") {
            merged[id] = { ...defaults[id], ...data.settings[id] };
          }
        }
        setValues(merged);
        setSavedValues(merged);
        setConfiguredSecrets(data.configuredSecrets ?? {});
        setStorageAvailable(data.storageAvailable !== false);
        setStorageMessage(data.storageMessage ?? "");
      })
      .catch((error) => {
        setValues(makeDefaultValues());
        setSavedValues(makeDefaultValues());
        setConfiguredSecrets({});
        setStorageAvailable(false);
        setStorageMessage(error instanceof Error ? error.message : "Đang dùng cài đặt mặc định vì chưa tải được dữ liệu lưu trữ.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "ai-provider" || loading || aiSettingsLoaded) return;
    fetch("/api/settings")
      .then(responseJson)
      .then((data) => {
      const aiSettingsFromApi = data.aiSettings ?? data.globalSettings?.["ai-provider"];
      const next = aiSettingsFromApi
      ? { ...defaultAiSettings, ...aiSettingsFromApi, baseUrl: aiSettingsFromApi.baseUrl ?? "" }
          : defaultAiSettings;
        setAiSettings(next);
        setSavedAiSettings(next);
        if (data.storageAvailable === false) {
          setStorageAvailable(false);
          setStorageMessage(data.storageMessage ?? "Cấu hình AI chưa thể đồng bộ với máy chủ.");
        }
      })
      .catch((error) => {
        setAiSettings(defaultAiSettings);
        setSavedAiSettings(defaultAiSettings);
        setStorageAvailable(false);
        setStorageMessage(error instanceof Error ? error.message : "Đang dùng cấu hình AI mặc định.");
      })
      .finally(() => setAiSettingsLoaded(true));
  }, [activeTab, aiSettingsLoaded, loading]);

  useEffect(() => {
    if (activeTab !== "channels" || loading || configuredSecrets["channels.facebookVerifyToken"] || secretDrafts["channels:facebookVerifyToken"]) return;
    const token = makeVerifyToken();
    setSecretDrafts((current) => ({ ...current, "channels:facebookVerifyToken": token }));
    setVisibleVerifyToken(token);
  }, [activeTab, configuredSecrets, loading, secretDrafts]);

  useEffect(() => {
    if (!categorySheetOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategorySheetOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [categorySheetOpen]);

  const activeTabInfo = settingsTabs.find((tab) => tab.id === activeTab)!;
  const ActiveTabIcon = settingsTabIcons[activeTab];
  const currentValues = values[activeTab];
  const dirty = useMemo(() => {
    if (activeTab === "ai-provider") {
      return JSON.stringify(aiSettings) !== JSON.stringify(savedAiSettings) || Boolean(aiApiKey);
    }
    const changedValues = JSON.stringify(values[activeTab]) !== JSON.stringify(savedValues[activeTab]);
    const changedSecrets = Object.keys(secretDrafts).some((key) => key.startsWith(`${activeTab}:`) && Boolean(secretDrafts[key]));
    return changedValues || changedSecrets;
  }, [activeTab, aiApiKey, aiSettings, savedAiSettings, savedValues, secretDrafts, values]);

  function setValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [activeTab]: { ...current[activeTab], [key]: value } }));
  }

  function setSecret(key: string, value: string) {
    setSecretDrafts((current) => ({ ...current, [`${activeTab}:${key}`]: value }));
  }

  async function saveSettings() {
    if (saving) return;
    setSaving(true);
    setNotice(null);
    try {
      if (activeTab === "ai-provider") {
        const data = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...aiSettings, apiKey: aiApiKey }),
        }).then(responseJson);
        const savedAiSettings = data.aiSettings ?? data.globalSettings?.["ai-provider"];
        const next = { ...aiSettings, ...savedAiSettings, baseUrl: savedAiSettings.baseUrl ?? "" };
        setAiSettings(next);
        setSavedAiSettings(next);
        setAiApiKey("");
        updateSettings("ai-provider", next);
        setNotice({ type: "success", message: "Đã lưu cài đặt thành công" });
        return;
      }
      const secrets = Object.fromEntries(
        Object.entries(secretDrafts)
          .filter(([key, value]) => key.startsWith(`${activeTab}:`) && value.length > 0)
          .map(([key, value]) => [key.slice(activeTab.length + 1), value]),
      );
      const data = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: activeTab, values: currentValues, secrets }),
      }).then(responseJson);
      const nextValues = { ...values, [activeTab]: data.values };
      setValues(nextValues);
      setSavedValues((current) => ({ ...current, [activeTab]: data.values }));
      setConfiguredSecrets((current) => ({ ...current, ...(data.configuredSecrets ?? {}) }));
      setSecretDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${activeTab}:`))));
      updateSettings(activeTab, data.values);
      setStorageAvailable(data.storageAvailable !== false);
      setStorageMessage(data.storageMessage ?? "");
      setNotice({ type: "success", message: "Đã lưu cài đặt thành công" });
    } catch (error) {
      const errorStatus = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
      const hasUnsavedSecrets = Object.entries(secretDrafts).some(([key, value]) => key.startsWith(`${activeTab}:`) && Boolean(value));
      if (activeTab !== "ai-provider" && !hasUnsavedSecrets && (errorStatus === 503 || error instanceof TypeError)) {
        updateSettings(activeTab, currentValues);
        setSavedValues((current) => ({ ...current, [activeTab]: currentValues }));
        setStorageAvailable(false);
        setStorageMessage("Đã lưu trên thiết bị này; máy chủ chưa đồng bộ.");
        setNotice({ type: "success", message: "Đã lưu cài đặt thành công" });
        return;
      }
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể lưu cài đặt." });
    } finally {
      setSaving(false);
    }
  }

  function selectPalette(palette: (typeof palettes)[number]) {
    setValue("colorPalette", palette.name);
    setValue("colors", { ...palette.colors });
  }

  function restoreColors() {
    setValue("colorMode", "light");
    setValue("colorPalette", "Mặc định");
    setValue("colorDescription", "");
    setValue("colors", { ...defaultColors });
    setDescription("");
  }

  async function suggestColors() {
    if (!description.trim() || aiBusy) return;
    setAiBusy(true);
    setNotice(null);
    try {
      const data = await fetch("/api/system-settings/suggest-colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      }).then(responseJson);
      setValue("colors", data.colors);
      setValue("colorPalette", "Tùy chỉnh");
      setValue("colorDescription", description);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể phối màu." });
    } finally {
      setAiBusy(false);
    }
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setNotice({ type: "error", message: "Không thể sao chép. Hãy chọn và sao chép thủ công." });
    }
  }

  async function connectFacebook() {
    if (!currentValues.facebookAppId || !configuredSecrets["channels.facebookAppSecret"]) {
      setNotice({ type: "error", message: "Hãy lưu App ID và App Secret trước khi đăng nhập Facebook." });
      return;
    }
    try {
      const { channels } = await fetch("/api/channels").then(responseJson);
      let channel = channels.find((item: { platform: string }) => item.platform === "facebook");
      if (!channel) {
        const result = await fetch("/api/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Facebook Page", platform: "facebook" }),
        }).then(responseJson);
        channel = result.channel;
      }
      window.location.assign(`/api/channels/${encodeURIComponent(channel.id)}/connect`);
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Không thể bắt đầu đăng nhập Facebook." });
    }
  }

  return (
    <div className="flex h-[100dvh] min-h-0 bg-[#f6f7fa] text-slate-800">
      <MainNavigation
        darkMode={false}
        receivingEnabled
        activePath="/settings"
        onToggleDarkMode={() => undefined}
        onToggleReceiving={() => undefined}
      />
      {appMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" onClick={() => setAppMenuOpen(false)}>
          <div className="h-full w-[min(330px,88vw)]" onClick={(event) => event.stopPropagation()}>
            <MainNavigation
              mobile
              open
              darkMode={false}
              receivingEnabled
              activePath="/settings"
              onClose={() => setAppMenuOpen(false)}
              onToggleDarkMode={() => undefined}
              onToggleReceiving={() => undefined}
            />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Mở menu" onClick={() => setAppMenuOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
            <span className="hidden text-xs text-slate-400 sm:inline">Quản trị</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-300 sm:block" />
            <span className="truncate text-sm font-semibold text-slate-800">Cài đặt</span>
          </div>
          <a href="/inbox" className="text-xs font-medium text-blue-700 hover:text-blue-800">Hộp thư</a>
        </header>
        <TopbarNavigation />
        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-6">
          <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-7">
            <div className="mb-5 flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Settings className="h-5 w-5" /></span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Cài đặt</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Cấu hình dùng chung cho cả hệ thống. Khoá bí mật được lưu mã hoá và không bao giờ hiển thị lại.</p>
              </div>
            </div>

            {notice && <div role="status" className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.type === "success" ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0" />}{notice.message}</div>}

            <div className="grid items-start gap-5 md:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="hidden rounded-2xl border border-slate-200 bg-white p-2 md:block">
                <nav aria-label="Danh mục cài đặt" className="space-y-1">
                  {settingsTabs.map(({ id, label }) => (
                    <button key={id} type="button" onClick={() => setActiveTab(id)} className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${activeTab === id ? "bg-blue-50 font-semibold text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{label}</button>
                  ))}
                </nav>
              </aside>

              <section className="min-w-0">
                <div className="mb-4 space-y-3 md:hidden">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={categorySheetOpen}
                    onClick={() => setCategorySheetOpen(true)}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-left shadow-sm transition hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <ActiveTabIcon className="h-5 w-5 shrink-0 text-blue-700" />
                      <span className="truncate text-base font-semibold text-slate-800">{activeTabInfo.label}</span>
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                  </button>
                  <nav aria-label="Cài đặt thường dùng" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {(["general", "appearance", "channels", "ai-provider", "business-hours"] as SettingsTabId[]).map((id) => {
                      const tab = settingsTabs.find((item) => item.id === id)!;
                      const TabIcon = settingsTabIcons[id];
                      return (
                        <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition ${activeTab === id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>
                          <TabIcon className="h-4 w-4" />{tab.label}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                    <h2 className="text-base font-bold text-slate-900">{activeTabInfo.label}</h2>
                    <p className="mt-1 text-sm text-slate-500">{activeTab === "general" ? "Cấu hình hệ thống và cách hiển thị số dư khách hàng." : activeTab === "appearance" ? "Tuỳ chỉnh bố cục menu, màu sắc và xem trước thay đổi." : activeTab === "channels" ? "Cấu hình ứng dụng, quyền truy cập và địa chỉ webhook nền tảng." : `Cấu hình ${activeTabInfo.label.toLocaleLowerCase("vi")} dùng chung cho hệ thống.`}</p>
                  </div>

                  {loading ? <div className="p-8 text-center text-sm text-slate-500">Đang tải cài đặt...</div> : (
                    <div className="space-y-6 p-5 sm:p-6">
                      {activeTab === "general" && <GeneralPanel values={currentValues} setValue={setValue} />}
                      {activeTab === "appearance" && (
                        <AppearancePanel
                          values={currentValues}
                          systemName={systemName}
                          setValue={setValue}
                          description={description}
                          setDescription={setDescription}
                          suggestColors={suggestColors}
                          aiBusy={aiBusy}
                          selectPalette={selectPalette}
                        />
                      )}
                      {activeTab === "channels" && (
                        <ChannelsPanel
                          values={currentValues}
                          setValue={setValue}
                          origin={origin}
                          secretDrafts={secretDrafts}
                          setSecret={setSecret}
                          configuredSecrets={configuredSecrets}
                          verifyToken={visibleVerifyToken}
                          setVerifyToken={(token) => { setVisibleVerifyToken(token); setSecret("facebookVerifyToken", token); }}
                          copyValue={copyValue}
                          copied={copied}
                          connectFacebook={connectFacebook}
                          saveSettings={saveSettings}
                          saving={saving}
                        />
                      )}
                      {activeTab === "ai-provider" && (
                        <AiProviderPanel
                          settings={aiSettings}
                          setSettings={setAiSettings}
                          apiKey={aiApiKey}
                          setApiKey={setAiApiKey}
                          loaded={aiSettingsLoaded}
                        />
                      )}
                      {activeTab !== "general" && activeTab !== "appearance" && activeTab !== "channels" && activeTab !== "ai-provider" && (
                        <GenericPanel
                          tab={activeTab}
                          values={currentValues}
                          setValue={setValue}
                          secretDrafts={secretDrafts}
                          setSecret={setSecret}
                          configuredSecrets={configuredSecrets}
                        />
                      )}
                    </div>
                  )}

                  {!loading && (
                    <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-3.5 backdrop-blur sm:px-6">
                      <p className={`text-xs ${storageAvailable === false ? "font-medium text-amber-700" : dirty ? "font-medium text-amber-700" : "text-slate-500"}`}>{storageAvailable === false ? (storageMessage || "Đang dùng cài đặt mặc định; chưa đồng bộ với máy chủ.") : dirty ? "Có thay đổi chưa lưu" : "Mọi thay đổi đã được lưu"}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {activeTab === "appearance" && <button type="button" onClick={restoreColors} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" />Khôi phục màu mặc định</button>}
                        <button type="button" disabled={!dirty || saving} onClick={saveSettings} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                          <Save className="h-4 w-4" />{saving ? "Đang lưu..." : activeTab === "appearance" ? "Lưu giao diện" : "Lưu cài đặt"}
                        </button>
                      </div>
                    </footer>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
        <div
          aria-hidden={!categorySheetOpen}
          className={`fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 transition-opacity duration-200 md:hidden ${categorySheetOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCategorySheetOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal={categorySheetOpen}
            aria-labelledby="settings-category-title"
            className={`flex max-h-[min(82dvh,720px)] w-full max-w-[600px] flex-col overflow-hidden rounded-t-3xl shadow-2xl transition-transform duration-300 ${darkTheme ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"} ${categorySheetOpen ? "translate-y-0" : "translate-y-full"}`}
          >
            <div className={`mx-auto mt-2 h-1.5 w-11 rounded-full ${darkTheme ? "bg-slate-700" : "bg-slate-200"}`} />
            <header className={`flex items-center justify-between border-b px-5 py-4 ${darkTheme ? "border-slate-800" : "border-slate-100"}`}>
              <div>
                <h2 id="settings-category-title" className="text-lg font-bold">Danh mục cài đặt</h2>
                <p className={`mt-1 text-sm ${darkTheme ? "text-slate-400" : "text-slate-500"}`}>Chọn mục cần cấu hình</p>
              </div>
              <button type="button" aria-label="Đóng danh mục cài đặt" onClick={() => setCategorySheetOpen(false)} className={`flex h-10 w-10 items-center justify-center rounded-full ${darkTheme ? "text-slate-300 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}><X className="h-5 w-5" /></button>
            </header>
            <nav aria-label="Tất cả danh mục cài đặt" className="min-h-0 space-y-1 overflow-y-auto p-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
              {settingsTabs.map(({ id, label }) => {
                const TabIcon = settingsTabIcons[id];
                const selected = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    onClick={() => {
                      setActiveTab(id);
                      setCategorySheetOpen(false);
                    }}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-base font-medium transition ${selected ? (darkTheme ? "bg-blue-950 text-blue-200" : "bg-blue-50 text-blue-800") : (darkTheme ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50")}`}
                  >
                    <TabIcon className={`h-5 w-5 shrink-0 ${selected ? "text-blue-600" : darkTheme ? "text-slate-400" : "text-slate-500"}`} />
                    <span className="min-w-0 flex-1">{label}</span>
                    {selected && <Check className="h-5 w-5 shrink-0 text-blue-600" />}
                  </button>
                );
              })}
            </nav>
          </section>
        </div>
        <BottomNavigation activePath="/settings" />
      </div>
    </div>
  );
}

function GeneralPanel({ values, setValue }: { values: Record<string, unknown>; setValue: (key: string, value: unknown) => void }) {
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  return (
    <>
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-800">Hệ thống</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Tên hệ thống<input className={inputClass} value={String(values.systemName ?? "")} onChange={(event) => setValue("systemName", event.target.value)} /></label>
          <label className="text-sm font-medium text-slate-700">Múi giờ<input className={inputClass} value={String(values.timezone ?? "")} onChange={(event) => setValue("timezone", event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Dùng để tính giờ làm việc và mốc thời gian trong báo cáo.</span></label>
          <label className="text-sm font-medium text-slate-700">Ngôn ngữ<select className={inputClass} value={String(values.language ?? "Tiếng Việt")} onChange={(event) => setValue("language", event.target.value)}><option>Tiếng Việt</option></select></label>
          <label className="text-sm font-medium text-slate-700">Trạng thái hội thoại mặc định<select className={inputClass} value={String(values.defaultConversationStatus ?? "Đang mở")} onChange={(event) => setValue("defaultConversationStatus", event.target.value)}><option>Đang mở</option><option>Đang chờ</option><option>Đã đóng</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Trạng thái gán cho hội thoại mới khi khách nhắn lần đầu.</span></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Tin nhắn trả lời ngoài giờ làm việc<textarea className={`${inputClass} min-h-20 resize-y`} placeholder="Cảm ơn anh/chị đã nhắn tin. Em sẽ phản hồi vào giờ làm việc ạ." value={String(values.afterHoursMessage ?? "")} onChange={(event) => setValue("afterHoursMessage", event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Để trống nếu không muốn tự động trả lời ngoài giờ.</span></label>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-slate-800">Số dư của khách</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">Mỗi khách có một ví để thanh toán ngay trong hội thoại. Đây là cái tên hiển thị cho số dư đó ở mọi màn hình.</p>
        <label className="mt-4 block max-w-md text-sm font-medium text-slate-700">Tên đơn vị số dư<input className={inputClass} value={String(values.balanceLabel ?? "Credits")} onChange={(event) => setValue("balanceLabel", event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Hiển thị thành “1.500 {String(values.balanceLabel ?? "Credits")}”.</span></label>
        <div className="mt-3 flex flex-wrap gap-2">{["Credits", "Coin", "Xu", "VND", "Điểm"].map((unit) => <button key={unit} type="button" onClick={() => setValue("balanceLabel", unit)} className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${values.balanceLabel === unit ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"}`}>{unit}</button>)}</div>
      </div>
    </>
  );
}

function AppearancePanel({
  values,
  systemName,
  setValue,
  description,
  setDescription,
  suggestColors,
  aiBusy,
  selectPalette,
}: {
  values: Record<string, unknown>;
  systemName: string;
  setValue: (key: string, value: unknown) => void;
  description: string;
  setDescription: (value: string) => void;
  suggestColors: () => void;
  aiBusy: boolean;
  selectPalette: (palette: (typeof palettes)[number]) => void;
}) {
  const colors = values.colors && typeof values.colors === "object" ? values.colors as Record<string, unknown> : defaultColors;
  const setColor = (key: ColorKey, value: string) => {
    setValue("colors", { ...colors, [key]: value });
  };
  return (
    <>
      <section>
        <h3 className="mb-3 text-sm font-bold text-slate-800">Bố cục menu</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ id: "topbar", label: "Thanh trên (Topbar)" }, { id: "sidebar", label: "Thanh bên (Sidebar)" }].map(({ id, label }) => <button key={id} type="button" role="radio" aria-checked={values.menuLayout === id} onClick={() => setValue("menuLayout", id)} className={`rounded-2xl border-2 p-4 text-left ${values.menuLayout === id ? "border-blue-500 bg-blue-50/60" : "border-slate-200 hover:border-slate-300"}`}><span className={`mb-3 block h-8 rounded-lg ${values.menuLayout === id ? "bg-blue-200" : "bg-slate-100"}`} /><span className="text-sm font-semibold text-slate-800">{label}</span></button>)}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800"><Sparkles className="h-4 w-4 text-violet-500" />Nhờ AI phối màu</h3>
        <textarea className="min-h-20 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="Ví dụ: tiệm bánh ngọt, tông kem và nâu ấm, nhìn nhẹ nhàng." value={description} onChange={(event) => setDescription(event.target.value)} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={aiBusy || !description.trim()} onClick={suggestColors} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Sparkles className="h-4 w-4" />{aiBusy ? "Đang phối màu..." : "Phối màu"}</button>
          {["Tiệm bánh, tông kem nâu ấm", "Công ty công nghệ, xanh dương hiện đại", "Thương hiệu cao cấp, đen và vàng đồng"].map((suggestion) => <button key={suggestion} type="button" onClick={() => setDescription(suggestion)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700">{suggestion}</button>)}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Bảng màu dựng sẵn</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">{palettes.map((palette) => <button key={palette.name} type="button" onClick={() => selectPalette(palette)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${values.colorPalette === palette.name ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}><span className="flex -space-x-1"><i className="h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: palette.colors.accent }} /><i className="h-4 w-4 rounded-full border-2 border-white" style={{ backgroundColor: palette.colors.brand }} /></span>{palette.name}</button>)}</div>
      </section>

      <section className="border-t border-slate-100 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800">Màu tùy chỉnh</h3>
          <div className="inline-flex rounded-xl bg-slate-100 p-1">{[{ id: "light", label: "Nền sáng" }, { id: "dark", label: "Nền tối" }].map(({ id, label }) => <button key={id} type="button" onClick={() => setValue("colorMode", id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${values.colorMode === id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{label}</button>)}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(colorLabels) as ColorKey[]).map((key) => <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700">{colorLabels[key]}<span className="flex items-center gap-2"><input aria-label={`${colorLabels[key]} color picker`} type="color" value={isColor(colors[key]) ? colors[key] : defaultColors[key]} onChange={(event) => setColor(key, event.target.value)} className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0" /><input aria-label={`${colorLabels[key]} mã hex`} value={String(colors[key] ?? defaultColors[key])} onChange={(event) => setColor(key, event.target.value)} className="w-[92px] rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs uppercase outline-none focus:border-blue-500" /></span></label>)}
        </div>
      </section>

      <section className="border-t border-slate-100 pt-5">
        <h3 className="mb-3 text-sm font-bold text-slate-800">Xem trước</h3>
        <div className="max-w-xl rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: values.colorMode === "dark" ? "#111827" : (isColor(colors.page) ? colors.page : defaultColors.page), color: values.colorMode === "dark" ? "#f8fafc" : (isColor(colors.text) ? colors.text : defaultColors.text) }}>
          <div className="rounded-xl border p-4 shadow-sm" style={{ backgroundColor: values.colorMode === "dark" ? "#1f2937" : (isColor(colors.card) ? colors.card : defaultColors.card), borderColor: isColor(colors.accent) ? colors.accent : defaultColors.accent }}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium opacity-60">{systemName}</p><p className="mt-1 font-bold">Hội thoại mới</p></div><span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ backgroundColor: isColor(colors.success) ? colors.success : defaultColors.success }}>Đã gửi</span></div>
            <p className="mt-3 rounded-lg bg-slate-50/80 p-3 text-sm text-slate-600">Cảm ơn bạn đã liên hệ. Chúng tôi sẽ sớm phản hồi.</p>
            <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: isColor(colors.warning) ? colors.warning : defaultColors.warning }}>Sắp trễ hạn</span><span className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: isColor(colors.danger) ? colors.danger : defaultColors.danger }}>Thất bại</span><span className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ backgroundColor: isColor(colors.info) ? colors.info : defaultColors.info }}>Ghi chú</span></div>
            <div className="mt-4 flex gap-2"><button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ backgroundColor: isColor(colors.accent) ? colors.accent : defaultColors.accent }}>Trả lời</button><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Để sau</button></div>
          </div>
        </div>
      </section>
    </>
  );
}

function ChannelsPanel({
  values,
  setValue,
  origin,
  secretDrafts,
  setSecret,
  configuredSecrets,
  verifyToken,
  setVerifyToken,
  copyValue,
  copied,
  connectFacebook,
  saveSettings,
  saving,
}: {
  values: Record<string, unknown>;
  setValue: (key: string, value: unknown) => void;
  origin: string;
  secretDrafts: Record<string, string>;
  setSecret: (key: string, value: string) => void;
  configuredSecrets: Record<string, boolean>;
  verifyToken: string;
  setVerifyToken: (token: string) => void;
  copyValue: (label: string, value: string) => void;
  copied: string;
  connectFacebook: () => void;
  saveSettings: () => void;
  saving: boolean;
}) {
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const savedTelegram = configuredSecrets["channels.telegramApiHash"];
  const savedFacebook = configuredSecrets["channels.facebookAppSecret"];
  const verifyConfigured = configuredSecrets["channels.facebookVerifyToken"];
  const webhookRows = [
    ["Callback URL", `${origin}/api/channels/webhooks/facebook`],
    ["Callback URL (Instagram)", `${origin}/api/channels/webhooks/instagram`],
    ["Verify Token", verifyToken || (verifyConfigured ? "Đã lưu · không hiển thị lại" : "")],
    ["OAuth Redirect URI", `${origin}/api/channels/facebook/oauth/callback`],
    ["URL chính sách quyền riêng tư", `${origin}/privacy`],
  ];
  return (
    <>
      <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-slate-800">Telegram cá nhân (MTProto)</h3><p className={`mt-1 text-xs font-semibold ${savedTelegram && values.telegramApiId ? "text-emerald-700" : "text-rose-600"}`}>• {savedTelegram && values.telegramApiId ? "Đã cấu hình thông tin API" : "Chưa cấu hình"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Thông tin xác thực được mã hoá</span></div>
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Lấy API tại my.telegram.org</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-blue-800"><li>Đăng nhập bằng số điện thoại Telegram tại <a className="underline" href="https://my.telegram.org" target="_blank" rel="noreferrer">my.telegram.org</a>.</li><li>Mở mục API development tools và tạo ứng dụng.</li><li>Sao chép API ID và API Hash vào biểu mẫu.</li></ol>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">API ID<input className={inputClass} value={String(values.telegramApiId ?? "")} onChange={(event) => setValue("telegramApiId", event.target.value)} /></label>
          <label className="text-sm font-medium text-slate-700">API Hash<input className={inputClass} type="password" autoComplete="new-password" placeholder={savedTelegram ? "Đã lưu · nhập giá trị mới để thay đổi" : "32 ký tự chữ và số"} value={secretDrafts["channels:telegramApiHash"] ?? ""} onChange={(event) => setSecret("telegramApiHash", event.target.value)} /></label>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />API Hash được mã hoá trước khi lưu và không được trả về trình duyệt.</p>
        <button type="button" onClick={saveSettings} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" />Lưu</button>
      </section>

      <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold text-slate-800">Ứng dụng Facebook</h3><p className={`mt-1 text-xs font-semibold ${savedFacebook && values.facebookAppId ? "text-emerald-700" : "text-rose-600"}`}>• {savedFacebook && values.facebookAppId ? "Đã cấu hình ứng dụng" : "Chưa cấu hình"}</p></div><a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">developers.facebook.com<ExternalLink className="h-3 w-3" /></a></div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold">Tạo ứng dụng Meta</p><ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-slate-600"><li>Tạo ứng dụng doanh nghiệp trong Meta for Developers.</li><li>Thêm sản phẩm Messenger và Instagram, rồi khai báo URL callback bên dưới.</li><li>Cấp quyền ứng dụng và hoàn tất xác minh theo hướng dẫn của Meta.</li></ol></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">App ID<input className={inputClass} value={String(values.facebookAppId ?? "")} onChange={(event) => setValue("facebookAppId", event.target.value)} /></label>
          <label className="text-sm font-medium text-slate-700">App Secret<input className={inputClass} type="password" autoComplete="new-password" placeholder={savedFacebook ? "Đã lưu · nhập giá trị mới để thay đổi" : "Nhập App Secret"} value={secretDrafts["channels:facebookAppSecret"] ?? ""} onChange={(event) => setSecret("facebookAppSecret", event.target.value)} /></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Token người quản trị<input className={inputClass} type="password" autoComplete="new-password" placeholder={configuredSecrets["channels.facebookAdminToken"] ? "Đã lưu · nhập giá trị mới để thay đổi" : "Dán token người dùng"} value={secretDrafts["channels:facebookAdminToken"] ?? ""} onChange={(event) => setSecret("facebookAdminToken", event.target.value)} /></label>
        </div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-semibold text-slate-800">Lấy token bằng một lần đăng nhập</h4><p className="mt-1 text-xs text-slate-500">Lưu App ID và App Secret trước, sau đó cấp quyền cho tài khoản Facebook.</p></div><button type="button" onClick={connectFacebook} className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"><span className="font-extrabold">f</span>Kết nối bằng Facebook</button></div>
        </div>

        <div className="mt-5">
          <h4 className="mb-3 text-sm font-bold text-slate-800">Khai webhook sang Meta</h4>
          <div className="space-y-2.5">{webhookRows.map(([label, value]) => (
            <div key={label} className="grid gap-1 sm:grid-cols-[190px_minmax(0,1fr)_auto] sm:items-center">
              <label className="text-xs font-medium text-slate-600">{label}</label>
              <input readOnly value={value} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600 outline-none" />
              {label === "Verify Token" && !verifyToken && verifyConfigured ? (
                <button type="button" onClick={() => { const bytes = new Uint8Array(24); window.crypto.getRandomValues(bytes); setVerifyToken(Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Tạo token mới</button>
              ) : (
                <button type="button" disabled={!value || value.startsWith("Đã lưu")} onClick={() => copyValue(label, value)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><Clipboard className="h-3.5 w-3.5" />{copied === label ? "Đã chép" : "Chép"}</button>
              )}
            </div>
          ))}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{["messages", "messaging_postbacks", "message_echoes"].map((permission) => <span key={permission} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 font-mono text-xs text-blue-800">{permission}</span>)}</div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" />App Secret, token và Verify Token được mã hoá và không hiển thị lại sau khi lưu.</p>
        <button type="button" onClick={saveSettings} disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save className="h-4 w-4" />Lưu</button>
      </section>
    </>
  );
}

function GenericPanel({
  tab,
  values,
  setValue,
  secretDrafts,
  setSecret,
  configuredSecrets,
}: {
  tab: SettingsTabId;
  values: Record<string, unknown>;
  setValue: (key: string, value: unknown) => void;
  secretDrafts: Record<string, string>;
  setSecret: (key: string, value: string) => void;
  configuredSecrets: Record<string, boolean>;
}) {
  const fields = genericSettingsFields[tab] ?? [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => <Field key={field.key} field={field} value={field.secret ? (secretDrafts[`${tab}:${field.key}`] ?? "") : values[field.key]} configured={Boolean(configuredSecrets[`${tab}.${field.key}`])} onChange={(value) => field.secret ? setSecret(field.key, String(value)) : setValue(field.key, value)} />)}
      {tab === "system" && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="font-semibold text-slate-700">Phiên bản hệ thống</p><p className="mt-1">Thông tin phiên bản sẽ được đồng bộ cùng bản phát hành.</p></div>}
      {tab === "updates" && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"><p className="font-semibold text-slate-700">Cập nhật phiên bản</p><p className="mt-1">Kiểm tra cập nhật khi hệ thống được kết nối với máy chủ phát hành.</p></div>}
    </div>
  );
}

function AiProviderPanel({
  settings,
  setSettings,
  apiKey,
  setApiKey,
  loaded,
}: {
  settings: AiProviderSettings;
  setSettings: (value: AiProviderSettings) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  loaded: boolean;
}) {
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  if (!loaded) return <p className="text-sm text-slate-500">Đang tải cấu hình nhà cung cấp AI...</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-700">Nhà cung cấp<select className={inputClass} value={settings.provider} onChange={(event) => setSettings({ ...settings, provider: event.target.value })}><option value="openai">OpenAI</option><option value="deepseek">DeepSeek</option><option value="custom">Tùy chỉnh (OpenAI-compatible)</option></select></label>
      {settings.provider === "custom" && <label className="text-sm font-medium text-slate-700">Base URL<input className={inputClass} placeholder="https://api.example.com/v1" value={settings.baseUrl} onChange={(event) => setSettings({ ...settings, baseUrl: event.target.value })} /></label>}
      <label className="text-sm font-medium text-slate-700">Mô hình hội thoại<input className={inputClass} value={settings.modelName} onChange={(event) => setSettings({ ...settings, modelName: event.target.value })} /></label>
      <label className="text-sm font-medium text-slate-700">Mô hình embedding<input className={inputClass} value={settings.embeddingModel} onChange={(event) => setSettings({ ...settings, embeddingModel: event.target.value })} /><span className="mt-1 block text-xs font-normal text-slate-500">Cơ sở dữ liệu hiện yêu cầu vector 1536 chiều.</span></label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">API Key<input className={inputClass} type="password" autoComplete="new-password" placeholder={settings.hasApiKey ? "Đã lưu · nhập khoá mới để thay đổi" : "Nhập API key"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} /><span className="mt-1 block text-xs font-normal text-slate-500">Khoá được mã hoá ở server. Giá trị đã lưu không được hiển thị lại.</span></label>
      <div className="sm:col-span-2"><Field field={{ key: "enabled", label: "Bật nhà cung cấp AI", type: "toggle" }} value={settings.isEnabled} onChange={(value) => setSettings({ ...settings, isEnabled: Boolean(value) })} /></div>
    </div>
  );
}
