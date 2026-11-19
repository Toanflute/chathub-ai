const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openChannelLoginWindow: (request) => ipcRenderer.invoke("channel:open-login", request),
  logoutChannelSession: (channelId) => ipcRenderer.invoke("channel:logout", channelId),
  onChannelAuthenticated: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on("channel:authenticated", handler);
    return () => ipcRenderer.removeListener("channel:authenticated", handler);
  },
});