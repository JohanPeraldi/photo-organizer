import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { analyzeFolder, organizePhotos, cleanup } from './photo-service.js';

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
  
  // Only open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
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

// Handle photo analysis
ipcMain.handle('photos:analyze', async (event, folderPath) => {
  try {
    const result = await analyzeFolder(folderPath);
    return result;
  } catch (error) {
    console.error('Error in photos:analyze handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handle photo organization
ipcMain.handle('photos:organize', async (event, folderPath) => {
  try {
    const result = await organizePhotos(folderPath);
    return result;
  } catch (error) {
    console.error('Error in photos:organize handler:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Clean up exiftool before quitting
  await cleanup();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Also add cleanup when the app is about to quit
app.on('before-quit', async () => {
  await cleanup();
});
