import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES modules don't have __dirname, so we create it
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadFile('index.html');
  
  // Open DevTools during development
  mainWindow.webContents.openDevTools();
}

// Handle folder selection
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
