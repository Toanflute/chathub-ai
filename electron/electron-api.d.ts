export {};

declare global {
  interface Window {
    electronAPI?: {
      openChannelLoginWindow(request: { channelId: string; provider: string; url?: string }): Promise<void>;
      logoutChannelSession(channelId: string): Promise<void>;
      onChannelAuthenticated(listener: (payload: { channelId: string; provider: string; sessionDetected: boolean }) => void): () => void;
    };
  }
}