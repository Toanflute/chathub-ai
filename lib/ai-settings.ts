import { prisma } from "@/lib/prisma";
import { readStoredSecret } from "@/lib/channel-credentials";
import { getStoredSettingsSecret, readSettingsDocument } from "@/lib/settings-store";

export type AiRuntimeSettings = {
  provider: string;
  baseUrl: string | null;
  modelName: string;
  embeddingModel: string;
  isEnabled: boolean;
  apiKey: string;
};

const defaults: AiRuntimeSettings = {
  provider: "openai",
  baseUrl: null,
  modelName: "gpt-4o-mini",
  embeddingModel: "text-embedding-3-small",
  isEnabled: false,
  apiKey: "",
};

export async function getAiRuntimeSettings(): Promise<AiRuntimeSettings> {
  let saved: Record<string, unknown> = {};
  let localApiKey: string | undefined;
  try {
    const document = await readSettingsDocument();
    saved = document.settings["ai-provider"] ?? {};
    localApiKey = await getStoredSettingsSecret("ai-provider", "apiKey");
  } catch (error) {
    console.error("Reading local AI settings failed; trying the database:", error);
  }
  try {
    const stored = await prisma.aiSettings.findFirst({ orderBy: { updatedAt: "desc" } });
    if (stored) {
      return {
        provider: typeof saved.provider === "string" ? saved.provider : stored.provider,
        baseUrl: typeof saved.baseUrl === "string" && saved.baseUrl ? saved.baseUrl : stored.baseUrl,
        modelName: typeof saved.modelName === "string" ? saved.modelName : stored.modelName,
        embeddingModel: typeof saved.embeddingModel === "string" ? saved.embeddingModel : stored.embeddingModel,
        isEnabled: typeof saved.isEnabled === "boolean" ? saved.isEnabled : stored.isEnabled,
        apiKey: localApiKey || (stored.apiKey ? readStoredSecret(stored.apiKey) : ""),
      };
    }
  } catch (error) {
    console.error("Loading database AI provider failed; using local settings:", error);
  }
  return {
    ...defaults,
    provider: typeof saved.provider === "string" ? saved.provider : defaults.provider,
    baseUrl: typeof saved.baseUrl === "string" && saved.baseUrl ? saved.baseUrl : null,
    modelName: typeof saved.modelName === "string" ? saved.modelName : defaults.modelName,
    embeddingModel: typeof saved.embeddingModel === "string" ? saved.embeddingModel : defaults.embeddingModel,
    isEnabled: saved.isEnabled === true,
  };
}
