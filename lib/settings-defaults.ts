import { genericSettingsFields, settingsTabs } from "@/lib/settings-definitions";
import type { SettingsRecord } from "@/lib/settings-store";

export const defaultSystemColors = {
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

export function createDefaultSettings(): SettingsRecord {
  const defaults: SettingsRecord = {};
  for (const { id } of settingsTabs) {
    if (id === "general") {
      defaults[id] = {
        systemName: "ChatHub",
        timezone: "Asia/Ho_Chi_Minh",
        language: "Tiếng Việt",
        defaultConversationStatus: "Đang mở",
        afterHoursMessage: "",
        balanceLabel: "Credits",
      };
    } else if (id === "appearance") {
      defaults[id] = {
        menuLayout: "topbar",
        colorMode: "light",
        colorPalette: "Mặc định",
        colorDescription: "",
        colors: { ...defaultSystemColors },
      };
    } else if (id === "channels") {
      defaults[id] = { telegramApiId: "", facebookAppId: "" };
    } else if (id === "ai-provider") {
      defaults[id] = {
        provider: "openai",
        baseUrl: "",
        modelName: "gpt-4o-mini",
        embeddingModel: "text-embedding-3-small",
        isEnabled: false,
        hasApiKey: false,
      };
    } else {
      defaults[id] = Object.fromEntries(
        (genericSettingsFields[id] ?? [])
          .filter((field) => !field.secret)
          .map((field) => [field.key, field.defaultValue ?? (field.type === "toggle" ? false : "")]),
      );
    }
  }
  return defaults;
}

export function mergeSettingsWithDefaults(settings: SettingsRecord): SettingsRecord {
  const defaults = createDefaultSettings();
  for (const [section, values] of Object.entries(settings)) {
    if (!defaults[section]) continue;
    defaults[section] = { ...defaults[section], ...values };
    if (section === "appearance" && values.colors && typeof values.colors === "object" && !Array.isArray(values.colors)) {
      defaults[section].colors = { ...defaultSystemColors, ...(values.colors as Record<string, unknown>) };
    }
  }
  return defaults;
}
