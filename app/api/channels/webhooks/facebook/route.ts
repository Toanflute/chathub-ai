import { verifyMetaWebhook } from "@/lib/meta-webhook";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return verifyMetaWebhook(request);
}
