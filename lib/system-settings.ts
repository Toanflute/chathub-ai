import { decryptSecretValue, encryptSecretValue } from "@/lib/channel-credentials";
import { prisma } from "@/lib/prisma";
import { getStoredSettingsSecret, mergeSettingsSection, readSettingsDocument } from "@/lib/settings-store";

export async function getSystemSettingValue(section: string, key: string) {
  try {
    const document = await readSettingsDocument();
    const localValue = document.settings[section]?.[key];
    if (localValue !== undefined) return localValue;
  } catch (error) {
    console.error("Reading local system setting failed; trying the database:", error);
  }
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: `values:${section}` } });
    if (setting?.value && typeof setting.value === "object" && !Array.isArray(setting.value)) {
      const value = (setting.value as Record<string, unknown>)[key];
      if (value !== undefined) return value;
    }
  } catch (error) {
    console.error("Reading database system setting failed; using local settings:", error);
  }
  return undefined;
}

export async function getSystemSecret(section: string, key: string) {
  try {
    const localSecret = await getStoredSettingsSecret(section, key);
    if (localSecret !== undefined) return localSecret;
  } catch (error) {
    console.error("Reading local system secret failed; trying the database:", error);
  }
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: `secret:${section}:${key}` } });
    if (setting?.secretEncrypted) return decryptSecretValue(setting.secretEncrypted);
  } catch (error) {
    console.error("Reading database system secret failed; using local settings:", error);
  }
  return getStoredSettingsSecret(section, key);
}

export async function saveSystemSecret(section: string, key: string, value: string) {
  const secretEncrypted = encryptSecretValue(value);
  await mergeSettingsSection(section, {}, { [key]: value });
  try {
    await prisma.systemSetting.upsert({
      where: { key: `secret:${section}:${key}` },
      create: { key: `secret:${section}:${key}`, secretEncrypted },
      update: { secretEncrypted },
    });
  } catch (error) {
    console.error("Saving database system secret failed; secret was saved locally:", error);
  }
}
