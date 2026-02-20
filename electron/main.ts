import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#000000',
    title: 'Hyperverse',
    autoHideMenuBar: true,
  });

  // Load the built app
  // In packaged app: use app.getAppPath() to get correct asar path
  const basePath = app.isPackaged ? app.getAppPath() : __dirname;
  const indexPath = app.isPackaged 
    ? path.join(basePath, 'dist', 'public', 'index.html')
    : path.join(__dirname, '../dist/public/index.html');
  
  mainWindow.loadFile(indexPath)
    .catch(err => {
      console.error('Failed to load index.html:', err);
      console.error('Attempted path:', indexPath);
      console.error('Base path:', basePath);
      console.error('Is packaged:', app.isPackaged);
    });

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

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
