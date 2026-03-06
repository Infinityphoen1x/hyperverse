import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Register the app protocol as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: false
    }
  }
]);

app.whenReady().then(() => {
  registerLocalResourceProtocol();
  createWindow();
});

// Register custom protocol for loading local files
function registerLocalResourceProtocol() {
  protocol.handle('app', async (request) => {
    let url = request.url.replace('app://', '');
    const decodedUrl = decodeURI(url);
    
    // Remove leading slash if present (handles both /assets/... and assets/...)
    let relativePath = decodedUrl.startsWith('/') ? decodedUrl.slice(1) : decodedUrl;
    
    // Handle empty path, './', or just '/' - serve index.html
    if (relativePath === '' || relativePath === './' || relativePath === '.') {
      relativePath = 'index.html';
    }
    
    // Get the base path for assets
    const basePath = app.isPackaged 
      ? path.join(app.getAppPath(), 'dist', 'public')
      : path.join(__dirname, '../dist/public');
    
    const filePath = path.normalize(path.join(basePath, relativePath));
    
    try {
      const data = await readFile(filePath);
      
      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      
      let mimeType = 'text/plain';
      switch (ext) {
        case '.html':
          mimeType = 'text/html; charset=utf-8';
          break;
        case '.css':
          mimeType = 'text/css; charset=utf-8';
          break;
        case '.js':
        case '.mjs':
          mimeType = 'application/javascript; charset=utf-8';
          break;
        case '.json':
          mimeType = 'application/json';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.svg':
          mimeType = 'image/svg+xml';
          break;
        case '.woff':
          mimeType = 'font/woff';
          break;
        case '.woff2':
          mimeType = 'font/woff2';
          break;
        case '.ttf':
          mimeType = 'font/ttf';
          break;
        case '.wav':
          mimeType = 'audio/wav';
          break;
        case '.mp3':
          mimeType = 'audio/mpeg';
          break;
      }
      
      return new Response(data, {
        headers: { 
          'Content-Type': mimeType,
          'Content-Length': data.length.toString()
        }
      });
    } catch (error) {
      console.error('Failed to load resource:', filePath, error);
      return new Response('File not found', { status: 404 });
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Required for YouTube iframe postMessage with app:// protocol
    },
    backgroundColor: '#000000',
    title: 'Hyperverse',
    autoHideMenuBar: true,
  });

  // Load using app:// custom protocol (appears as https-like to YouTube API)
  console.log('Loading from: app://./');
  console.log('Is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  
  mainWindow.loadURL('app://./')
    .catch(err => {
      console.error('Failed to load app:', err);
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
