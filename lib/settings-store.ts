import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { decryptSecretValue, encryptSecretValue } from "@/lib/channel-credentials";

export type SettingsRecord = Record<string, Record<string, unknown>>;
type SettingsDocument = {
  version: 1;
  settings: SettingsRecord;
  secrets: Record<string, string>;
};

const emptyDocument = (): SettingsDocument => ({ version: 1, settings: {}, secrets: {} });
let writeQueue: Promise<void> = Promise.resolve();

function settingsFilePath() {
  return process.env.CHATHUB_SETTINGS_FILE
    ? path.resolve(process.env.CHATHUB_SETTINGS_FILE)
    : path.join(process.cwd(), "data", "settings.json");
}

async function loadDocument(): Promise<SettingsDocument> {
  const filePath = settingsFilePath();
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Tệp cài đặt có cấu trúc không hợp lệ.");
    }
    const document = parsed as Partial<SettingsDocument>;
    if (document.version !== 1 || !document.settings || typeof document.settings !== "object" || !document.secrets || typeof document.secrets !== "object") {
      throw new Error("Tệp cài đặt có cấu trúc không hợp lệ.");
    }
    return {
      version: 1,
      settings: document.settings,
      secrets: document.secrets,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyDocument();
    throw error;
  }
}

async function saveDocument(document: SettingsDocument) {
  const filePath = settingsFilePath();
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

export async function readSettingsDocument() {
  return loadDocument();
}

export async function mergeSettingsSection(section: string, values: Record<string, unknown>, secrets: Record<string, string> = {}) {
  const operation = writeQueue.then(async () => {
    const document = await loadDocument();
    const mergedValues = { ...(document.settings[section] ?? {}), ...values };
    const mergedSecrets = { ...document.secrets };
    for (const [key, value] of Object.entries(secrets)) {
      if (value) mergedSecrets[`${section}.${key}`] = encryptSecretValue(value);
    }
    const next = {
      ...document,
      settings: { ...document.settings, [section]: mergedValues },
      secrets: mergedSecrets,
    };
    await saveDocument(next);
    return { settings: mergedValues, secrets: next.secrets };
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function mergeSettingsSections(settings: SettingsRecord) {
  const operation = writeQueue.then(async () => {
    const document = await loadDocument();
    const merged: SettingsRecord = { ...document.settings };
    for (const [section, values] of Object.entries(settings)) {
      merged[section] = { ...(merged[section] ?? {}), ...values };
    }
    const next = { ...document, settings: merged };
    await saveDocument(next);
    return next;
  });
  writeQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function getStoredSettingsSecret(section: string, key: string) {
  const document = await loadDocument();
  const encrypted = document.secrets[`${section}.${key}`];
  return encrypted ? decryptSecretValue(encrypted) : undefined;
}

export async function getConfiguredSettingsSecrets() {
  const document = await loadDocument();
  return Object.fromEntries(Object.keys(document.secrets).map((key) => [key, true]));
}
