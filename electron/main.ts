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

// Register protocol as privileged before app is ready
app.whenReady().then(() => {
  // Register custom protocol before creating window
  registerLocalResourceProtocol();
  createWindow();
});

// Register custom protocol for loading local files
function registerLocalResourceProtocol() {
  protocol.handle('app', async (request) => {
    let url = request.url.replace('app://', '');
    const decodedUrl = decodeURI(url);
    
    // Remove leading slash if present (handles both /assets/... and assets/...)
    const relativePath = decodedUrl.startsWith('/') ? decodedUrl.slice(1) : decodedUrl;
    
    // Get the base path for assets
    // app.getAppPath() returns the asar path when packaged, which Electron handles transparently
    const basePath = app.isPackaged 
      ? path.join(app.getAppPath(), 'dist', 'public')
      : path.join(__dirname, '../dist/public');
    
    const filePath = path.normalize(path.join(basePath, relativePath));
    
    console.log('Protocol handler - requested:', url);
    console.log('Protocol handler - relative:', relativePath);
    console.log('Protocol handler - resolved:', filePath);
    console.log('Protocol handler - exists:', existsSync(filePath));
    
    try {
      const data = await readFile(filePath);
      
      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      console.log('Protocol handler - extension:', ext);
      
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
      
      console.log('Protocol handler - MIME type:', mimeType);
      
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
      webSecurity: true,
    },
    backgroundColor: '#000000',
    title: 'Hyperverse',
    autoHideMenuBar: true,
  });

  // Load the built app
  // In development: load from dist/public
  // In packaged app: files are in the app root (electron-builder extracts them)
  const indexPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar', 'dist', 'public', 'index.html')
    : path.join(__dirname, '../dist/public/index.html');
  
  console.log('Loading index from:', indexPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  
  // Use custom protocol to load the app
  mainWindow.loadURL('app://index.html')
    .catch(err => {
      console.error('Failed to load app:', err);
      console.error('Falling back to loadFile...');
      // Fallback to loadFile if protocol fails
      mainWindow?.loadFile(indexPath).catch(e => {
        console.error('Fallback also failed:', e);
      });
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
