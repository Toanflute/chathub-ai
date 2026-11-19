export const settingsTabs = [
  { id: "general", label: "Chung" },
  { id: "appearance", label: "Giao diện" },
  { id: "channels", label: "Kênh" },
  { id: "payments", label: "Thanh toán" },
  { id: "email", label: "Email" },
  { id: "telegram-notifications", label: "Thông báo Telegram" },
  { id: "ai-provider", label: "Nhà cung cấp AI" },
  { id: "translation", label: "Dịch" },
  { id: "custom-fields", label: "Nhãn & trường tùy chỉnh" },
  { id: "business-hours", label: "Giờ làm việc" },
  { id: "file-storage", label: "Lưu trữ tệp" },
  { id: "data-cleanup", label: "Dọn dẹp dữ liệu" },
  { id: "permissions", label: "Phân quyền" },
  { id: "system", label: "Hệ thống" },
  { id: "error-logs", label: "Nhật ký lỗi" },
  { id: "updates", label: "Cập nhật phiên bản" },
  { id: "addons", label: "Addon" },
] as const;

export type SettingsTabId = (typeof settingsTabs)[number]["id"];
export type SettingsFieldType = "text" | "number" | "password" | "textarea" | "select" | "toggle";

export type SettingsFieldDefinition = {
  key: string;
  label: string;
  type: SettingsFieldType;
  placeholder?: string;
  help?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
  secret?: boolean;
};

export const genericSettingsFields: Partial<Record<SettingsTabId, SettingsFieldDefinition[]>> = {
  payments: [
    { key: "provider", label: "Nhà cung cấp", type: "select", options: ["Thủ công", "Stripe", "PayPal"] },
    { key: "currency", label: "Đơn vị tiền tệ", type: "text", defaultValue: "VND" },
    { key: "webhookSecret", label: "Khoá webhook", type: "password", secret: true },
    { key: "enabled", label: "Bật thanh toán", type: "toggle", defaultValue: false },
  ],
  email: [
    { key: "host", label: "Máy chủ SMTP", type: "text", placeholder: "smtp.example.com" },
    { key: "port", label: "Cổng", type: "number", defaultValue: 587 },
    { key: "username", label: "Tên đăng nhập", type: "text" },
    { key: "password", label: "Mật khẩu SMTP", type: "password", secret: true },
    { key: "fromAddress", label: "Địa chỉ gửi", type: "text", placeholder: "support@example.com" },
  ],
  "telegram-notifications": [
    { key: "botToken", label: "Bot Token", type: "password", secret: true },
    { key: "chatId", label: "Chat ID", type: "text" },
    { key: "enabled", label: "Bật thông báo", type: "toggle", defaultValue: false },
  ],
  "ai-provider": [
    { key: "provider", label: "Nhà cung cấp", type: "select", options: ["OpenAI", "DeepSeek", "Tùy chỉnh"] },
    { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://api.example.com/v1" },
    { key: "modelName", label: "Mô hình", type: "text", defaultValue: "gpt-4o-mini" },
    { key: "apiKey", label: "API Key", type: "password", secret: true },
    { key: "enabled", label: "Bật nhà cung cấp", type: "toggle", defaultValue: false },
  ],
  translation: [
    { key: "provider", label: "Nhà cung cấp dịch", type: "select", options: ["Google", "DeepL", "Tùy chỉnh"] },
    { key: "apiKey", label: "API Key", type: "password", secret: true },
    { key: "targetLanguage", label: "Ngôn ngữ đích", type: "text", defaultValue: "Tiếng Việt" },
  ],
  "custom-fields": [
    { key: "contactFields", label: "Trường liên hệ", type: "textarea", placeholder: "Mỗi dòng một trường tùy chỉnh" },
    { key: "conversationLabels", label: "Nhãn hội thoại", type: "textarea", placeholder: "Mỗi dòng một nhãn" },
  ],
  "business-hours": [
    { key: "timezone", label: "Múi giờ", type: "text", defaultValue: "Asia/Ho_Chi_Minh" },
    { key: "schedule", label: "Lịch làm việc", type: "textarea", placeholder: "Thứ 2 - Thứ 6: 08:00 - 17:00" },
    { key: "enabled", label: "Bật giờ làm việc", type: "toggle", defaultValue: false },
  ],
  "file-storage": [
    { key: "provider", label: "Nhà cung cấp", type: "select", options: ["Lưu trữ cục bộ", "Amazon S3", "Tùy chỉnh"] },
    { key: "bucket", label: "Bucket", type: "text" },
    { key: "region", label: "Khu vực", type: "text" },
    { key: "accessKey", label: "Access Key", type: "password", secret: true },
    { key: "secretKey", label: "Secret Key", type: "password", secret: true },
  ],
  "data-cleanup": [
    { key: "conversationDays", label: "Lưu hội thoại (ngày)", type: "number", defaultValue: 365 },
    { key: "logDays", label: "Lưu nhật ký (ngày)", type: "number", defaultValue: 90 },
    { key: "autoCleanup", label: "Tự động dọn dẹp", type: "toggle", defaultValue: false },
  ],
  permissions: [
    { key: "adminRoles", label: "Quyền quản trị", type: "textarea", defaultValue: "Chủ sở hữu\nQuản trị viên" },
    { key: "agentRoles", label: "Quyền nhân viên", type: "textarea", defaultValue: "Nhân viên\nChỉ xem" },
  ],
  system: [
    { key: "maintenanceMode", label: "Chế độ bảo trì", type: "toggle", defaultValue: false },
    { key: "publicUrl", label: "URL hệ thống", type: "text", placeholder: "https://example.com" },
  ],
  "error-logs": [
    { key: "retentionDays", label: "Thời gian lưu nhật ký (ngày)", type: "number", defaultValue: 30 },
    { key: "notifyOnError", label: "Thông báo khi có lỗi", type: "toggle", defaultValue: false },
  ],
  updates: [
    { key: "autoCheck", label: "Tự động kiểm tra phiên bản", type: "toggle", defaultValue: true },
    { key: "updateChannel", label: "Kênh cập nhật", type: "select", options: ["Ổn định", "Thử nghiệm"] },
  ],
  addons: [
    { key: "enabledAddons", label: "Addon đang bật", type: "textarea", placeholder: "Mỗi dòng một addon" },
  ],
};

export const generalSettingKeys = [
  "systemName",
  "timezone",
  "language",
  "defaultConversationStatus",
  "afterHoursMessage",
  "balanceLabel",
] as const;

export const appearanceSettingKeys = ["menuLayout", "colorMode", "colorPalette", "colorDescription", "colors"] as const;

export const channelSettingKeys = ["telegramApiId", "facebookAppId"] as const;

export const channelSecretKeys = [
  "telegramApiHash",
  "facebookAppSecret",
  "facebookAdminToken",
  "facebookVerifyToken",
] as const;

export function settingKeysForTab(tab: SettingsTabId) {
  if (tab === "general") return { values: [...generalSettingKeys], secrets: [] as string[] };
  if (tab === "appearance") return { values: [...appearanceSettingKeys], secrets: [] as string[] };
  if (tab === "channels") return { values: [...channelSettingKeys], secrets: [...channelSecretKeys] };
  const fields = genericSettingsFields[tab] ?? [];
  return {
    values: fields.filter((field) => !field.secret).map((field) => field.key),
    secrets: fields.filter((field) => field.secret).map((field) => field.key),
  };
}
