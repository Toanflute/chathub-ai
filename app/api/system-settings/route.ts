import { NextResponse } from "next/server";
import { encryptSecretValue } from "@/lib/channel-credentials";
import { isAuthenticatedRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnavailableError, isPrismaTableMissingError } from "@/lib/prisma-errors";
import { settingsTabs, settingKeysForTab, type SettingsTabId } from "@/lib/settings-definitions";
import { getConfiguredSettingsSecrets, mergeSettingsSection, readSettingsDocument } from "@/lib/settings-store";

export const runtime = "nodejs";

const tabIds = new Set<string>(settingsTabs.map(({ id }) => id));
const appearanceColors = new Set(["accent", "brand", "page", "card", "text", "success", "warning", "danger", "info"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateValues(section: SettingsTabId, values: Record<string, unknown>) {
  const allowed = new Set(settingKeysForTab(section).values);
  if (Object.keys(values).some((key) => !allowed.has(key))) return "Có trường cấu hình không được hỗ trợ.";
  for (const [key, value] of Object.entries(values)) {
    if (section === "appearance" && key === "colors") {
      if (!isRecord(value) || Object.entries(value).some(([color, hex]) => !appearanceColors.has(color) || typeof hex !== "string" || !/^#[\da-f]{6}$/i.test(hex))) {
        return "Bảng màu không hợp lệ.";
      }
      continue;
    }
    if (typeof value === "string" && value.length <= 10_000) continue;
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) continue;
    return `Giá trị "${key}" không hợp lệ hoặc quá dài.`;
  }
  if (section === "general") {
    if (values.defaultConversationStatus !== undefined && !["Đang mở", "Đang chờ", "Đã đóng"].includes(String(values.defaultConversationStatus))) {
      return "Trạng thái hội thoại mặc định không hợp lệ.";
    }
    if (values.language !== undefined && values.language !== "Tiếng Việt") return "Ngôn ngữ hiện chưa được hỗ trợ.";
    if (values.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: String(values.timezone) });
      } catch {
        return "Múi giờ không hợp lệ.";
      }
    }
  }
  if (section === "appearance" && values.menuLayout !== undefined && !["topbar", "sidebar"].includes(String(values.menuLayout))) {
    return "Bố cục menu không hợp lệ.";
  }
  if (section === "appearance" && values.colorMode !== undefined && !["light", "dark"].includes(String(values.colorMode))) {
    return "Chế độ màu không hợp lệ.";
  }
  return null;
}

export async function GET() {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để xem cài đặt." }, { status: 401 });
  try {
    const document = await readSettingsDocument();
    const settings: Record<string, unknown> = {};
    const configuredSecrets: Record<string, boolean> = await getConfiguredSettingsSecrets();
    let storageMessage = "";
    try {
      const stored = await prisma.systemSetting.findMany();
      for (const item of stored) {
        if (item.key.startsWith("values:") && item.value && typeof item.value === "object" && !Array.isArray(item.value)) {
          settings[item.key.slice("values:".length)] = item.value;
        } else if (item.key.startsWith("secret:")) {
          const secretKey = item.key.slice("secret:".length);
          configuredSecrets[secretKey] = Boolean(item.secretEncrypted) || configuredSecrets[secretKey] === true;
        }
      }
    } catch (error) {
      console.error("Loading database settings failed; using local settings:", error);
      storageMessage = isPrismaTableMissingError(error) || isDatabaseUnavailableError(error)
        ? "Đang dùng kho cài đặt cục bộ; cơ sở dữ liệu chưa sẵn sàng để đồng bộ."
        : "Đang dùng kho cài đặt cục bộ vì không thể đọc cơ sở dữ liệu.";
    }
    for (const [section, values] of Object.entries(document.settings)) {
      settings[section] = {
        ...(settings[section] as Record<string, unknown> | undefined),
        ...values,
      };
    }
    return NextResponse.json({ settings, configuredSecrets, storageAvailable: true, ...(storageMessage ? { storageMessage } : {}) });
  } catch (error) {
    console.error("Loading system settings failed:", error);
    return NextResponse.json({ settings: {}, configuredSecrets: {}, storageAvailable: false, storageMessage: "Không thể đọc tệp cài đặt; hiện đang dùng cấu hình mặc định." });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest()) return NextResponse.json({ error: "Cần đăng nhập để cập nhật cài đặt." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nội dung yêu cầu không phải JSON hợp lệ." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.section !== "string" || !tabIds.has(body.section) || !isRecord(body.values) || (body.secrets !== undefined && !isRecord(body.secrets))) {
    return NextResponse.json({ error: "Cấu hình gửi lên không hợp lệ." }, { status: 400 });
  }
  if (JSON.stringify(body).length > 50_000) return NextResponse.json({ error: "Cấu hình vượt quá dung lượng cho phép." }, { status: 413 });
  const section = body.section as SettingsTabId;
  const values = body.values;
  const validationError = validateValues(section, values);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const secrets = (body.secrets ?? {}) as Record<string, unknown>;
  const allowedSecrets = new Set(settingKeysForTab(section).secrets);
  if (Object.keys(secrets).some((key) => !allowedSecrets.has(key))) {
    return NextResponse.json({ error: "Có trường bí mật không được hỗ trợ." }, { status: 400 });
  }
  for (const [key, value] of Object.entries(secrets)) {
    if (typeof value !== "string" || value.length > 10_000) {
      return NextResponse.json({ error: `Giá trị bí mật "${key}" không hợp lệ.` }, { status: 400 });
    }
  }

  try {
    const storageKey = `values:${section}`;
    const secretValues = Object.fromEntries(
      Object.entries(secrets).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
    );
    const localSettings = await mergeSettingsSection(section, values, secretValues);
    let storageMessage = "";
    const configuredSecrets: Record<string, boolean> = await getConfiguredSettingsSecrets();
    for (const key of Object.keys(secretValues)) configuredSecrets[`${section}.${key}`] = true;
    try {
      const previous = await prisma.systemSetting.findUnique({ where: { key: storageKey } });
      const previousValues = previous?.value && typeof previous.value === "object" && !Array.isArray(previous.value)
        ? previous.value as Record<string, unknown>
        : {};
      const nextValues = { ...previousValues, ...values };
      const updates = Object.entries(secretValues).map(([key, value]) => ({
        key: `secret:${section}:${key}`,
        secretEncrypted: encryptSecretValue(value),
      }));
      await prisma.$transaction([
        prisma.systemSetting.upsert({
          where: { key: storageKey },
          create: { key: storageKey, value: JSON.parse(JSON.stringify(nextValues)) },
          update: { value: JSON.parse(JSON.stringify(nextValues)) },
        }),
        ...updates.map(({ key, secretEncrypted }) => prisma.systemSetting.upsert({
          where: { key },
          create: { key, secretEncrypted },
          update: { secretEncrypted },
        })),
      ]);
    } catch (error) {
      console.error("Saving database settings failed; settings were saved locally:", error);
      storageMessage = "Đã lưu vào tệp cài đặt cục bộ; cơ sở dữ liệu chưa sẵn sàng để đồng bộ.";
    }
    return NextResponse.json({ success: true, section, values: localSettings.settings, configuredSecrets, storageAvailable: true, ...(storageMessage ? { storageMessage } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu cài đặt.";
    console.error("Saving system settings failed:", error);
    const status = message.includes("CHANNEL_CREDENTIALS_KEY") || isDatabaseUnavailableError(error) ? 503 : 400;
    return NextResponse.json({ error: message.includes("CHANNEL_CREDENTIALS_KEY") ? "Cần cấu hình CHANNEL_CREDENTIALS_KEY để mã hoá khoá bí mật." : status === 503 ? "Không thể lưu cài đặt. Kiểm tra quyền ghi tệp cục bộ hoặc cấu hình cơ sở dữ liệu." : "Không thể lưu cài đặt hệ thống." }, { status });
  }
}
