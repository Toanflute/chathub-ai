import { GET as completeOAuth } from "@/app/api/channels/oauth/callback/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return completeOAuth(request);
}
