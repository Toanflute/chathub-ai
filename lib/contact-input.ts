export type ContactWriteData = {
  name?: string;
  initials?: string;
  avatar?: string;
  email?: string | null;
  phone?: string | null;
  orderNumber?: string | null;
  channel?: string;
  balance?: number;
  address?: string;
  connected?: boolean;
  tag?: string;
  assignee?: string;
  activity?: number;
  notes?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
  nullable = false,
): { value?: string | null; error?: string } {
  if (!(key in body)) return {};
  const raw = body[key];
  if (nullable && (raw === null || raw === "")) return { value: null };
  if (typeof raw !== "string") return { error: `${key} phải là chuỗi.` };
  const value = raw.trim();
  if (value.length > maxLength) return { error: `${key} không được vượt quá ${maxLength} ký tự.` };
  return { value };
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] : ""}`.toLocaleUpperCase("vi");
}

export function parseContactWriteData(
  value: unknown,
  options: { partial?: boolean } = {},
): { data?: ContactWriteData; error?: string } {
  if (!isRecord(value)) return { error: "Dữ liệu liên hệ không hợp lệ." };
  const partial = options.partial ?? false;
  const data: ContactWriteData = {};

  const textFields: [keyof ContactWriteData, number, boolean][] = [
    ["name", 120, false],
    ["email", 254, true],
    ["phone", 40, true],
    ["orderNumber", 60, true],
    ["channel", 80, false],
    ["address", 200, false],
    ["tag", 80, false],
    ["assignee", 80, false],
  ];

  for (const [field, maxLength, nullable] of textFields) {
    const parsed = readText(value, field, maxLength, nullable);
    if (parsed.error) return { error: parsed.error };
    if (field in value) (data as Record<string, unknown>)[field] = parsed.value;
  }

  if (typeof data.name === "string") {
    if (!data.name) return { error: "Tên liên hệ không được để trống." };
    data.initials = initialsFor(data.name);
    data.avatar = "bg-sky-100 text-sky-700";
  } else if (!partial) {
    return { error: "Tên liên hệ là bắt buộc." };
  }

  if ("balance" in value) {
    const raw = value.balance;
    const balance = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.replace(/\./g, "").replace(",", ".")) : NaN;
    if (!Number.isFinite(balance) || balance < 0 || balance > 9999999999) return { error: "Số dư không hợp lệ." };
    data.balance = balance;
  }
  if ("connected" in value) {
    if (typeof value.connected !== "boolean") return { error: "Trạng thái kết nối không hợp lệ." };
    data.connected = value.connected;
  }
  if ("activity" in value) {
    if (typeof value.activity !== "number" || !Number.isInteger(value.activity) || value.activity < 0) return { error: "Số hoạt động không hợp lệ." };
    data.activity = value.activity;
  }
  if ("notes" in value) {
    if (!Array.isArray(value.notes) || value.notes.length > 100 || value.notes.some((note) => typeof note !== "string" || note.length > 2000)) {
      return { error: "Ghi chú không hợp lệ." };
    }
    data.notes = value.notes as string[];
  }
  if (partial && Object.keys(data).length === 0) return { error: "Không có trường hợp lệ để cập nhật." };

  return { data };
}
