const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  analysePhotos: (folderPath) => ipcRenderer.invoke('photos:analyse', folderPath)
});

console.log('Preload script loaded successfully!');
