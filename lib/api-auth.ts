import { cookies } from "next/headers";

export function isAuthenticatedRequest() {
  return cookies().get("chathub-auth")?.value === "true";
}
