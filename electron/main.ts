import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createServer, IncomingMessage, ServerResponse } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let localServer: ReturnType<typeof createServer> | null = null;
const LOCAL_PORT = 45362; // Random high port to avoid conflicts

// Register the app protocol as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true // Enable CORS for YouTube iframe communication
    }
  }
]);

app.whenReady().then(() => {
  startLocalServer();
  registerLocalResourceProtocol(); // Keep as fallback
  createWindow();
});

// Start a local HTTP server to serve the app (avoids YouTube postMessage origin issues)
function startLocalServer() {
  const basePath = app.isPackaged 
    ? path.join(app.getAppPath(), 'dist', 'public')
    : path.join(__dirname, '../dist/public');
  
  localServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html';
    filePath = decodeURI(filePath);
    
    const fullPath = path.normalize(path.join(basePath, filePath));
    
    try {
      const data = await readFile(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      
      let mimeType = 'text/plain';
      switch (ext) {
        case '.html': mimeType = 'text/html; charset=utf-8'; break;
        case '.js': mimeType = 'application/javascript; charset=utf-8'; break;
        case '.css': mimeType = 'text/css; charset=utf-8'; break;
        case '.json': mimeType = 'application/json'; break;
        case '.png': mimeType = 'image/png'; break;
        case '.jpg':
        case '.jpeg': mimeType = 'image/jpeg'; break;
        case '.gif': mimeType = 'image/gif'; break;
        case '.svg': mimeType = 'image/svg+xml'; break;
        case '.ico': mimeType = 'image/x-icon'; break;
        case '.woff': mimeType = 'font/woff'; break;
        case '.woff2': mimeType = 'font/woff2'; break;
        case '.ttf': mimeType = 'font/ttf'; break;
        case '.wav': mimeType = 'audio/wav'; break;
        case '.mp3': mimeType = 'audio/mpeg'; break;
      }
      
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': data.length,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    } catch (error) {
      console.error('Failed to load resource:', fullPath, error);
      res.writeHead(404);
      res.end('File not found');
    }
  });
  
  localServer.listen(LOCAL_PORT, 'localhost', () => {
    console.log(`Local server started at http://localhost:${LOCAL_PORT}`);
  });
}

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
      webSecurity: true, // Can be enabled with localhost
    },
    backgroundColor: '#000000',
    title: 'Hyperverse',
    autoHideMenuBar: true,
  });

  // Load using local HTTP server (provides proper origin for YouTube iframe)
  const loadUrl = `http://localhost:${LOCAL_PORT}`;
  console.log('Loading from:', loadUrl);
  console.log('Is packaged:', app.isPackaged);
  console.log('App path:', app.getAppPath());
  
  mainWindow.loadURL(loadUrl)
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
  // Windows/Linux: Always quit when all windows close
  // macOS: Only quit when packaged (standard macOS behavior - stay open in dev)
  if (process.platform !== 'darwin' || app.isPackaged) {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Properly clean up server before quit
app.on('before-quit', (event) => {
  if (localServer) {
    console.log('Closing local server before quit...');
    try {
      localServer.close(() => {
        console.log('Local server closed successfully');
      });
      // Force close all connections
      localServer.closeAllConnections?.();
    } catch (error) {
      console.error('Error closing server:', error);
    }
    localServer = null;
  }
});

app.on('will-quit', () => {
  // Final cleanup
  if (localServer) {
    try {
      localServer.close();
      localServer.closeAllConnections?.();
    } catch (error) {
      console.error('Error in will-quit cleanup:', error);
    }
    localServer = null;
  }
});
