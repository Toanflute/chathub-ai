export const oauthStateCookie = "chathub-channel-oauth";

export type OAuthState = {
  state: string;
  channelId: string;
  provider: "meta" | "zalo" | "discord";
  verifier?: string;
};
