import { randomUUID } from "node:crypto";
import { readLocalJsonArray, updateLocalJsonArray } from "@/lib/local-json-store";

export type LocalChannel = {
  id: string;
  code: string;
  name: string;
  platform: string;
  status: string;
  enabled: boolean;
  groupSync: boolean;
  groups: string[];
  externalAccountId: string | null;
  connectedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  authMode: string;
};

const fileName = "channels.json";

export function getLocalChannels() {
  return readLocalJsonArray<LocalChannel>(fileName);
}

export function createLocalChannel(name: string, platform: string, connected: boolean) {
  return updateLocalJsonArray<LocalChannel, LocalChannel>(fileName, (channels) => {
    const prefix = platform === "zalo_personal" ? "ch-zp" : `ch-${platform}`;
    const usedCodes = new Set(channels.map((channel) => channel.code));
    let sequence = 1;
    while (usedCodes.has(`${prefix}-${String(sequence).padStart(2, "0")}`)) sequence += 1;
    const now = new Date().toISOString();
    const channel: LocalChannel = {
      id: `local-${randomUUID()}`,
      code: `${prefix}-${String(sequence).padStart(2, "0")}`,
      name,
      platform,
      status: connected ? "connected" : "needs_config",
      enabled: true,
      groupSync: false,
      groups: [],
      externalAccountId: null,
      connectedAt: connected ? now : null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
      authMode: platform === "zalo_personal" ? "qr" : "manual",
    };
    return { values: [...channels, channel], result: channel };
  });
}

export function updateLocalChannel(id: string, data: Partial<Pick<LocalChannel, "name" | "enabled" | "groupSync" | "groups">>) {
  return updateLocalJsonArray<LocalChannel, LocalChannel | null>(fileName, (channels) => {
    let updatedChannel: LocalChannel | null = null;
    const next = channels.map((channel) => {
      if (channel.id !== id) return channel;
      const updated = { ...channel, ...data, updatedAt: new Date().toISOString() };
      updatedChannel = updated;
      return updated;
    });
    return { values: next, result: updatedChannel };
  });
}

export function deleteLocalChannel(id: string) {
  return updateLocalJsonArray<LocalChannel, boolean>(fileName, (channels) => {
    const next = channels.filter((channel) => channel.id !== id);
    return { values: next, result: next.length !== channels.length };
  });
}
