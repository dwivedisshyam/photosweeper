const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  deleteFiles: (paths) => ipcRenderer.invoke("delete-files", paths),
});
