const { BrowserWindow } = require("electron");

const providerUrls = {
  zalo_personal: "https://chat.zalo.me/",
  facebook: "https://www.messenger.com/",
  telegram_personal: "https://web.telegram.org/",
};

const providerHosts = {
  zalo_personal: ["zalo.me"],
  facebook: ["facebook.com", "messenger.com"],
  telegram_personal: ["telegram.org"],
};

function normalizedChannelId(channelId) {
  if (typeof channelId !== "string" || !/^[a-zA-Z0-9._-]{1,120}$/.test(channelId)) {
    throw new Error("Mã tài khoản kênh không hợp lệ.");
  }
  return channelId;
}

function isProviderUrl(provider, value) {
  try {
    const url = new URL(value);
    const hosts = providerHosts[provider] || [];
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function createSessionManager(sessions, onChannelAuthenticated = () => {}) {
  const windows = new Map();

  function getPartition(channelId) {
    return `persist:channel_${normalizedChannelId(channelId)}`;
  }

  function openChannelLoginWindow({ channelId, provider, url }) {
    const normalizedId = normalizedChannelId(channelId);
    const targetUrl = url || providerUrls[provider];
    if (!providerUrls[provider] || !isProviderUrl(provider, targetUrl)) {
      throw new Error("Nhà cung cấp hoặc URL đăng nhập không được hỗ trợ.");
    }

    const previousWindow = windows.get(normalizedId);
    if (previousWindow && !previousWindow.isDestroyed()) {
      previousWindow.focus();
      return;
    }

    const providerSession = sessions.fromPartition(getPartition(normalizedId));
    const loginWindow = new BrowserWindow({
      width: 1080,
      height: 800,
      minWidth: 720,
      minHeight: 560,
      title: `Đăng nhập ${provider}`,
      webPreferences: {
        session: providerSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    windows.set(normalizedId, loginWindow);
    let lastSessionDetectedUrl = "";
    loginWindow.webContents.on("did-finish-load", () => {
      const currentUrl = loginWindow.webContents.getURL();
      if (currentUrl === lastSessionDetectedUrl) return;
      let detected = false;
      try {
        const parsed = new URL(currentUrl);
        detected = provider === "zalo_personal"
          ? parsed.hostname.endsWith("zalo.me") && !/(login|auth|qr)/i.test(parsed.pathname + parsed.hash)
          : provider === "facebook"
            ? (parsed.hostname.endsWith("facebook.com") || parsed.hostname.endsWith("messenger.com")) && !/(login|checkpoint|auth)/i.test(parsed.pathname)
            : parsed.hostname.endsWith("telegram.org") && !/(login|auth)/i.test(parsed.pathname);
      } catch {
        detected = false;
      }
      if (!detected) return;
      lastSessionDetectedUrl = currentUrl;
      onChannelAuthenticated({ channelId: normalizedId, provider, sessionDetected: true });
    });
    loginWindow.on("closed", () => {
      if (windows.get(normalizedId) === loginWindow) windows.delete(normalizedId);
    });
    loginWindow.webContents.setWindowOpenHandler(({ url: openedUrl }) => {
      if (isProviderUrl(provider, openedUrl)) {
        loginWindow.loadURL(openedUrl);
      }
      return { action: "deny" };
    });
    void loginWindow.loadURL(targetUrl);
  }

  async function logoutChannelSession(channelId) {
    const normalizedId = normalizedChannelId(channelId);
    const loginWindow = windows.get(normalizedId);
    if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
    windows.delete(normalizedId);
    const providerSession = sessions.fromPartition(getPartition(normalizedId));
    await providerSession.clearStorageData();
    await providerSession.clearCache();
    await providerSession.clearAuthCache();
  }

  return { openChannelLoginWindow, logoutChannelSession };
}

module.exports = { createSessionManager, providerUrls };