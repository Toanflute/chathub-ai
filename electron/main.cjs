const { app, BrowserWindow, ipcMain, session } = require("electron");
const { createServer } = require("node:http");
const { copyFile, mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");
const next = require("next");
const { createSessionManager } = require("./session-manager.cjs");

let mainWindow;
const sessionManager = createSessionManager(session, (payload) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("channel:authenticated", payload);
  }
});
let nextServer;

function initializeDataPaths() {
  const dataDirectory = path.join(app.getPath("userData"), "data");
  process.env.CHATHUB_DATA_DIR = dataDirectory;
  process.env.CHATHUB_SETTINGS_FILE = path.join(dataDirectory, "settings.json");
  return dataDirectory;
}

async function ensureLocalFiles(dataDirectory) {
  await mkdir(dataDirectory, { recursive: true });
  const packagedDataDirectory = path.join(app.getAppPath(), "data");
  const fileNames = ["channels.json", "conversations.json", "messages.json", "settings.json", "notifications.json", "inbox-conversations.json"];

  if (app.isPackaged) {
    await Promise.all(fileNames.map(async (fileName) => {
      const sourcePath = path.join(packagedDataDirectory, fileName);
      const destinationPath = path.join(dataDirectory, fileName);
      try {
        await copyFile(sourcePath, destinationPath, require("node:fs").constants.COPYFILE_EXCL);
      } catch (error) {
        if (error.code !== "ENOENT" && error.code !== "EEXIST") throw error;
      }
    }));
  }

  await Promise.all(fileNames.map(async (fileName) => {
    const filePath = path.join(dataDirectory, fileName);
    try {
      await writeFile(filePath, fileName === "settings.json" ? "{}\n" : "[]\n", { flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }));
}

async function startNextServer() {
  process.env.NODE_ENV = "production";
  process.chdir(app.getAppPath());
  const nextApp = next({ dev: false, dir: app.getAppPath() });
  await nextApp.prepare();
  nextServer = createServer(nextApp.getRequestHandler());
  await new Promise((resolve, reject) => {
    nextServer.once("error", reject);
    nextServer.listen(0, "127.0.0.1", resolve);
  });
  const address = nextServer.address();
  if (!address || typeof address === "string") throw new Error("Không thể lấy cổng Next.js nội bộ.");
  return `http://127.0.0.1:${address.port}`;
}

function registerIpcHandlers() {
  ipcMain.handle("channel:open-login", (event, request) => {
    if (event.senderFrame.url.startsWith("http://127.0.0.1:") || event.senderFrame.url.startsWith("http://localhost:")) {
      return sessionManager.openChannelLoginWindow(request || {});
    }
    throw new Error("Nguồn gọi IPC không hợp lệ.");
  });
  ipcMain.handle("channel:logout", (event, channelId) => {
    if (event.senderFrame.url.startsWith("http://127.0.0.1:") || event.senderFrame.url.startsWith("http://localhost:")) {
      return sessionManager.logoutChannelSession(channelId);
    }
    throw new Error("Nguồn gọi IPC không hợp lệ.");
  });
}

async function createMainWindow() {
  const startUrl = app.isPackaged ? await startNextServer() : "http://localhost:3000";
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const appOrigin = new URL(startUrl).origin;
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (new URL(navigationUrl).origin !== appOrigin) event.preventDefault();
  });
  await mainWindow.loadURL(startUrl);
}

app.whenReady().then(async () => {
  const dataDirectory = initializeDataPaths();
  await ensureLocalFiles(dataDirectory);
  registerIpcHandlers();
  await createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
}).catch((error) => {
  console.error("Khởi động ChatHub Desktop thất bại:", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (nextServer) nextServer.close();
});