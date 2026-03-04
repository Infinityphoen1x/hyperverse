import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Note: Custom protocol removed - using standard file:// protocol with loadFile()
// This avoids ES module issues with custom protocols

app.whenReady().then(() => {
  createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local resources
    },
    backgroundColor: '#000000',
    title: 'Hyperverse',
    autoHideMenuBar: true,
  });

  // Load using file:// protocol via loadFile
  const indexPath = app.isPackaged 
    ? path.join(app.getAppPath(), 'dist', 'public', 'index.html')
    : path.join(__dirname, '../dist/public/index.html');
  
  console.log('Loading index from:', indexPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  console.log('File exists:', existsSync(indexPath));
  
  mainWindow.loadFile(indexPath)
    .catch(err => {
      console.error('Failed to load index.html:', err);
    });

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
