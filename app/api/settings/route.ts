import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { encryptSecretValue, readStoredSecret } from "@/lib/channel-credentials";
import { isDatabaseUnavailableError } from "@/lib/prisma-errors";
import { createDefaultSettings, mergeSettingsWithDefaults } from "@/lib/settings-defaults";
import { settingKeysForTab, settingsTabs, type SettingsTabId } from "@/lib/settings-definitions";
import { getConfiguredSettingsSecrets, getStoredSettingsSecret, mergeSettingsSection, mergeSettingsSections, readSettingsDocument, type SettingsRecord } from "@/lib/settings-store";

export const runtime = "nodejs";
const defaultAiSettings = {
  provider: "openai",
  baseUrl: null as string | null,
  modelName: "gpt-4o-mini",
  embeddingModel: "text-embedding-3-small",
  isEnabled: false,
  hasApiKey: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clientFor(settings: { provider: string; baseUrl: string | null; apiKey: string }) {
  const baseURL = settings.baseUrl?.trim() || (settings.provider === "deepseek" ? "https://api.deepseek.com" : undefined);
  return new OpenAI({ apiKey: settings.apiKey, ...(baseURL ? { baseURL } : {}), timeout: 15_000, maxRetries: 0 });
}

async function loadAiSettings() {
  const document = await readSettingsDocument();
  const fileSettings = document.settings["ai-provider"] ?? {};
  const fileApiKey = await getStoredSettingsSecret("ai-provider", "apiKey");
  let databaseSettings: typeof defaultAiSettings = defaultAiSettings;
  let databaseApiKey = "";
  try {
    const stored = await prisma.aiSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (stored) {
      databaseSettings = {
        provider: stored.provider,
        baseUrl: stored.baseUrl,
        modelName: stored.modelName,
        embeddingModel: stored.embeddingModel,
        isEnabled: stored.isEnabled,
        hasApiKey: Boolean(stored.apiKey),
      };
      databaseApiKey = stored.apiKey ? readStoredSecret(stored.apiKey) : "";
    }
  } catch (error) {
    console.error("Loading database AI settings failed:", error);
  }
  return {
    settings: {
      ...databaseSettings,
      ...fileSettings,
      baseUrl: typeof fileSettings.baseUrl === "string" && fileSettings.baseUrl ? fileSettings.baseUrl : databaseSettings.baseUrl,
      hasApiKey: Boolean(fileApiKey || databaseApiKey),
    },
    apiKey: fileApiKey || databaseApiKey,
  };
}

function validateSection(section: SettingsTabId, values: Record<string, unknown>) {
  const allowed = section === "ai-provider"
    ? new Set(["provider", "baseUrl", "modelName", "embeddingModel", "isEnabled"])
    : new Set(settingKeysForTab(section).values);
  if (Object.keys(values).some((key) => !allowed.has(key))) return "Có trường cấu hình không được hỗ trợ.";
  for (const [key, value] of Object.entries(values)) {
    if (section === "appearance" && key === "colors") {
      if (!isRecord(value) || Object.entries(value).some(([color, hex]) => !["accent", "brand", "page", "card", "text", "success", "warning", "danger", "info"].includes(color) || typeof hex !== "string" || !/^#[\da-f]{6}$/i.test(hex))) {
        return "Bảng màu không hợp lệ.";
      }
    } else if (typeof value === "string" && value.length <= 10_000) {
      continue;
    } else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
      continue;
    } else {
      return `Giá trị "${key}" không hợp lệ hoặc quá dài.`;
    }
  }
  if (section === "general") {
    if (values.defaultConversationStatus !== undefined && !["Đang mở", "Đang chờ", "Đã đóng"].includes(String(values.defaultConversationStatus))) return "Trạng thái hội thoại mặc định không hợp lệ.";
    if (values.timezone !== undefined) {
      try { new Intl.DateTimeFormat("en-US", { timeZone: String(values.timezone) }); } catch { return "Múi giờ không hợp lệ."; }
    }
  }
  if (section === "appearance") {
    if (values.menuLayout !== undefined && !["topbar", "sidebar"].includes(String(values.menuLayout))) return "Bố cục menu không hợp lệ.";
    if (values.colorMode !== undefined && !["light", "dark"].includes(String(values.colorMode))) return "Chế độ màu không hợp lệ.";
  }
  return null;
}

function publicGlobalSettings(settings: SettingsRecord) {
  const publicSettings = mergeSettingsWithDefaults(settings);
  const ai = publicSettings["ai-provider"];
  return {
    ...publicSettings,
    "ai-provider": {
      provider: ai.provider ?? "openai",
      baseUrl: ai.baseUrl ?? "",
      modelName: ai.modelName ?? "gpt-4o-mini",
      embeddingModel: ai.embeddingModel ?? "text-embedding-3-small",
      isEnabled: ai.isEnabled === true,
      hasApiKey: ai.hasApiKey === true,
    },
  };
}

async function loadGlobalSettingsSnapshot() {
  const document = await readSettingsDocument();
  const settings: SettingsRecord = { ...document.settings };
  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { startsWith: "values:" } },
      select: { key: true, value: true },
    });
    for (const row of rows) {
      const section = row.key.slice("values:".length);
      if (isRecord(row.value)) settings[section] = { ...row.value, ...(settings[section] ?? {}) };
    }
  } catch (error) {
    console.error("Loading database settings for the response failed; using local settings:", error);
  }
  const snapshot: SettingsRecord = publicGlobalSettings(settings);
  try {
    const ai = await loadAiSettings();
    snapshot["ai-provider"] = { ...ai.settings };
  } catch (error) {
    console.error("Loading AI settings for the response failed; using defaults:", error);
  }
  return snapshot;
}

export async function GET() {
  try {
    const document = await readSettingsDocument();
    const authenticated = isAuthenticatedRequest();
    const storedSettings = { ...document.settings };
    try {
      const rows = await prisma.systemSetting.findMany({
        where: authenticated ? { key: { startsWith: "values:" } } : { key: { in: ["values:general", "values:appearance"] } },
        select: { key: true, value: true },
      });
      for (const row of rows) {
        const section = row.key.slice("values:".length);
        if (isRecord(row.value)) {
          storedSettings[section] = { ...row.value, ...(storedSettings[section] ?? {}) };
        }
      }
    } catch (error) {
      console.error("Loading database system settings failed; using local settings:", error);
    }
    const globalSettings: SettingsRecord = publicGlobalSettings(storedSettings);
    let configuredSecrets: Record<string, boolean> = {};
    let aiSettings: Record<string, unknown> = defaultAiSettings;
    let apiKey = "";
    if (authenticated) {
      configuredSecrets = await getConfiguredSettingsSecrets();
      try {
        const secretRows = await prisma.systemSetting.findMany({
          where: { key: { startsWith: "secret:" } },
          select: { key: true, secretEncrypted: true },
        });
        for (const row of secretRows) {
          const key = row.key.slice("secret:".length).replace(":", ".");
          configuredSecrets[key] = Boolean(row.secretEncrypted) || configuredSecrets[key] === true;
        }
      } catch (error) {
        console.error("Loading database secret status failed; using local status:", error);
      }
      try {
        const loaded = await loadAiSettings();
        aiSettings = loaded.settings;
        apiKey = loaded.apiKey;
        globalSettings["ai-provider"] = { ...aiSettings };
      } catch (error) {
        console.error("Loading AI settings failed; using defaults:", error);
      }
      if (!configuredSecrets["ai-provider.apiKey"]) configuredSecrets["ai-provider.apiKey"] = Boolean(apiKey);
    }
    const responseSettings: SettingsRecord = authenticated
      ? globalSettings
      : { general: globalSettings.general, appearance: globalSettings.appearance };
    return NextResponse.json({
      settings: responseSettings,
      globalSettings: responseSettings,
      aiSettings: { ...aiSettings, hasApiKey: Boolean(apiKey || aiSettings.hasApiKey) },
      configuredSecrets,
      storageAvailable: true,
    });
  } catch (error) {
    console.error("Loading settings file failed; returning defaults:", error);
    const defaults = createDefaultSettings();
    return NextResponse.json({
      settings: defaultAiSettings,
      aiSettings: defaultAiSettings,
      globalSettings: publicGlobalSettings(defaults),
      configuredSecrets: {},
      storageAvailable: false,
      storageMessage: "Không thể đọc tệp cài đặt; hiện đang dùng cấu hình mặc định.",
    });
  }
}

async function saveAiSettings(data: Record<string, unknown>) {
  const provider = String(data.provider ?? "");
  if (!["openai", "deepseek", "custom"].includes(provider)) return NextResponse.json({ error: "Provider không hợp lệ." }, { status: 400 });
  const submittedApiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
  const previous = await loadAiSettings().catch(() => ({ settings: defaultAiSettings, apiKey: "" }));
  const apiKey = submittedApiKey || previous.apiKey;
  if (!apiKey) return NextResponse.json({ error: "Vui lòng nhập API key." }, { status: 400 });
  const modelName = String(data.modelName ?? "").trim();
  const embeddingModel = String(data.embeddingModel ?? "text-embedding-3-small").trim();
  const baseUrl = typeof data.baseUrl === "string" && data.baseUrl.trim() ? data.baseUrl.trim() : null;
  if (!modelName || !embeddingModel) return NextResponse.json({ error: "Model và embedding model không được để trống." }, { status: 400 });
  if (baseUrl) {
    try { const parsed = new URL(baseUrl); if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(); }
    catch { return NextResponse.json({ error: "Base URL không hợp lệ." }, { status: 400 }); }
  }
  const isEnabled = Boolean(data.isEnabled);
  if (data.testConnection) await clientFor({ provider, baseUrl, apiKey }).models.list();

  const aiValues = { provider, baseUrl: baseUrl ?? "", modelName, embeddingModel, isEnabled, hasApiKey: true };
  await mergeSettingsSection("ai-provider", aiValues, { apiKey });
  try {
    const stored = await prisma.aiSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    const encryptedApiKey = encryptSecretValue(apiKey);
    if (stored) {
      await prisma.aiSettings.update({ where: { id: stored.id }, data: { provider, baseUrl, apiKey: encryptedApiKey, modelName, embeddingModel, isEnabled } });
    } else {
      await prisma.aiSettings.create({ data: { provider, baseUrl, apiKey: encryptedApiKey, modelName, embeddingModel, isEnabled } });
    }
  } catch (error) {
    console.error("Saving database AI settings failed; settings were saved locally:", error);
  }
  return NextResponse.json({
    success: true,
    tested: Boolean(data.testConnection),
    settings: publicGlobalSettings((await readSettingsDocument()).settings),
    aiSettings: { ...aiValues, baseUrl, hasApiKey: true },
    storageAvailable: true,
    globalSettings: await loadGlobalSettingsSnapshot(),
  });
}

async function saveSection(body: Record<string, unknown>) {
  if (typeof body.section !== "string" || !settingsTabs.some((tab) => tab.id === body.section) || !isRecord(body.values) || (body.secrets !== undefined && !isRecord(body.secrets))) {
    return NextResponse.json({ error: "Cấu hình gửi lên không hợp lệ." }, { status: 400 });
  }
  const section = body.section as SettingsTabId;
  const values = body.values;
  const validationError = validateSection(section, values);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const allowedSecrets = new Set(settingKeysForTab(section).secrets);
  const secrets = (body.secrets ?? {}) as Record<string, unknown>;
  if (Object.keys(secrets).some((key) => !allowedSecrets.has(key)) || Object.values(secrets).some((value) => typeof value !== "string" || value.length > 10_000)) {
    return NextResponse.json({ error: "Giá trị bí mật không hợp lệ." }, { status: 400 });
  }
  const secretValues = Object.fromEntries(Object.entries(secrets).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1])));
  const merged = await mergeSettingsSection(section, values, secretValues);
  const allSettings = await loadGlobalSettingsSnapshot();
  const configuredSecrets = await getConfiguredSettingsSecrets();
  for (const key of Object.keys(secretValues)) configuredSecrets[`${section}.${key}`] = true;
  return NextResponse.json({ success: true, section, values: merged.settings, settings: allSettings, globalSettings: allSettings, configuredSecrets, storageAvailable: true });
}

export async function POST(request: Request) {
  try {
    if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật cài đặt." }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Cấu hình gửi lên không hợp lệ." }, { status: 400 });
    if (JSON.stringify(body).length > 50_000) return NextResponse.json({ error: "Cấu hình vượt quá dung lượng cho phép." }, { status: 413 });
    if (typeof body.section === "string") {
      if (body.section === "ai-provider" && isRecord(body.values)) {
        const aiValues = { ...body.values };
        const secrets = isRecord(body.secrets) ? body.secrets : {};
        return await saveAiSettings({ ...aiValues, apiKey: secrets.apiKey ?? body.apiKey });
      }
      return await saveSection(body);
    }
    return await saveAiSettings(body);
  } catch (error) {
    console.error("Saving settings failed:", error);
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("CHANNEL_CREDENTIALS_KEY") || isDatabaseUnavailableError(error) ? 503 : 400;
    return NextResponse.json({ error: message.includes("CHANNEL_CREDENTIALS_KEY") ? "Cần cấu hình CHANNEL_CREDENTIALS_KEY để mã hoá bí mật." : status === 503 ? "Không thể lưu cài đặt. Kiểm tra quyền ghi tệp cục bộ và cấu hình kho lưu trữ." : "Không thể lưu cài đặt." }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật cài đặt." }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Cấu hình gửi lên không hợp lệ." }, { status: 400 });
    if (JSON.stringify(body).length > 50_000) return NextResponse.json({ error: "Cấu hình vượt quá dung lượng cho phép." }, { status: 413 });
    const candidate = isRecord(body.settings) ? body.settings : body;
    const updates: SettingsRecord = {};
    for (const [section, rawValues] of Object.entries(candidate)) {
      if (!settingsTabs.some((tab) => tab.id === section) || !isRecord(rawValues)) return NextResponse.json({ error: `Danh mục "${section}" không hợp lệ.` }, { status: 400 });
      const publicValues = { ...rawValues };
      if (section === "ai-provider") delete publicValues.hasApiKey;
      const validationError = validateSection(section as SettingsTabId, publicValues);
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
      updates[section] = publicValues;
    }
    await mergeSettingsSections(updates);
    const globalSettings = await loadGlobalSettingsSnapshot();
    return NextResponse.json({ success: true, settings: globalSettings, globalSettings, storageAvailable: true });
  } catch (error) {
    console.error("Updating settings failed:", error);
    return NextResponse.json({ error: "Không thể lưu cài đặt. Kiểm tra quyền ghi tệp cài đặt." }, { status: 503 });
  }
}
