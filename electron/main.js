const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  // prevent common reload shortcuts (Cmd/Ctrl+R, F5)
  win.webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    if ((input.control || input.meta) && key === "r") event.preventDefault();
    if (input.key === "F5") event.preventDefault();
    // open DevTools with Cmd/Ctrl+Shift+I
    if ((input.control || input.meta) && input.shift && key === "i") {
      win.webContents.openDevTools({ mode: "detach" });
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  // remove default menu to avoid accidental refresh via menu
  try {
    Menu.setApplicationMenu(null);
  } catch (e) {}
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.handle("select-folder", async () => {
  try {
    // prefer attaching the dialog to the focused window so it's visible above the app
    const focused = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(focused, {
      properties: ["openDirectory"],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const folder = result.filePaths[0];
    try {
      const entries = await fs.readdir(folder);
      const images = entries
        .filter((name) => /\.(jpe?g|png|gif|webp|bmp|tiff)$/i.test(name))
        .map((name) => path.join(folder, name));
      images.sort();
      return images;
    } catch (err) {
      // read dir error (suppressed)
      return [];
    }
  } catch (err) {
    // select-folder handler error (suppressed)
    return null;
  }
});

ipcMain.handle("delete-files", async (event, paths) => {
  const results = [];
  for (const p of paths) {
    try {
      await fs.unlink(p);
      results.push({ path: p, ok: true });
    } catch (err) {
      // delete-file error (suppressed)
      results.push({ path: p, ok: false, error: String(err) });
    }
  }
  return results;
});

app.on("window-all-closed", () => {
  // Quit the app when all windows are closed on all platforms.
  app.quit();
});
