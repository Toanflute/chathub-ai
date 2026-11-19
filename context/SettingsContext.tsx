"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createDefaultSettings, mergeSettingsWithDefaults } from "@/lib/settings-defaults";
import type { SettingsRecord } from "@/lib/settings-store";

const STORAGE_KEY = "chathub-settings:v1";
const SettingsContext = createContext<{
  settings: SettingsRecord;
  updateSettings: (section: string, values: Record<string, unknown>) => void;
  refreshSettings: () => Promise<void>;
}>({
  settings: createDefaultSettings(),
  updateSettings: () => undefined,
  refreshSettings: async () => undefined,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readLocalSettings(): SettingsRecord | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed)) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])),
    );
  } catch {
    return null;
  }
}

function persistLocalSettings(settings: SettingsRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Persisting local settings failed:", error);
  }
}

function applySettings(settings: SettingsRecord) {
  const root = document.documentElement;
  const general = settings.general ?? {};
  const appearance = settings.appearance ?? {};
  const colors = isRecord(appearance.colors) ? appearance.colors : {};
  const cssColorNames: Record<string, string> = {
    accent: "--color-primary",
    brand: "--color-brand",
    page: "--color-bg",
    card: "--color-card",
    text: "--color-text",
    success: "--color-success",
    warning: "--color-warning",
    danger: "--color-danger",
    info: "--color-info",
  };
  for (const [key, property] of Object.entries(cssColorNames)) {
    const color = colors[key];
    if (typeof color === "string" && /^#[\da-f]{6}$/i.test(color)) root.style.setProperty(property, color);
  }
  const mode = (appearance.themeMode ?? appearance.colorMode) === "dark" ? "dark" : "light";
  if (mode === "dark") {
    root.style.setProperty("--color-bg", "#111827");
    root.style.setProperty("--color-card", "#1f2937");
    root.style.setProperty("--color-text", "#f8fafc");
  }
  root.dataset.theme = mode;
  root.dataset.menuLayout = appearance.menuLayout === "sidebar" ? "sidebar" : "topbar";
  root.classList.toggle("dark", mode === "dark");
  try {
    window.localStorage.setItem("chathub-theme", mode);
  } catch (error) {
    console.error("Persisting theme preference failed:", error);
  }
  const systemName = typeof general.systemName === "string" && general.systemName.trim()
    ? general.systemName.trim()
    : "ChatHub";
  document.title = systemName;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<SettingsRecord>(createDefaultSettings);

  const refreshSettings = useCallback(async () => {
    const localSettings = readLocalSettings();
    if (localSettings) setSettings(mergeSettingsWithDefaults(localSettings));
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && isRecord(data.globalSettings)) {
        const merged = mergeSettingsWithDefaults({ ...(localSettings ?? {}), ...data.globalSettings } as SettingsRecord);
        setSettings(merged);
        persistLocalSettings(merged);
      }
    } catch (error) {
      console.error("Loading global settings failed; using local settings:", error);
    }
  }, []);

  const updateSettings = useCallback((section: string, values: Record<string, unknown>) => {
    setSettings((current) => {
      const next = { ...current, [section]: { ...(current[section] ?? {}), ...values } };
      persistLocalSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    const syncSettings = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (isRecord(parsed)) setSettings(mergeSettingsWithDefaults(parsed as SettingsRecord));
      } catch (error) {
        console.error("Syncing settings from another tab failed:", error);
      }
    };
    window.addEventListener("storage", syncSettings);
    return () => window.removeEventListener("storage", syncSettings);
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [pathname, settings]);

  const contextValue = useMemo(() => ({ settings, updateSettings, refreshSettings }), [settings, updateSettings, refreshSettings]);
  return <SettingsContext.Provider value={contextValue}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
