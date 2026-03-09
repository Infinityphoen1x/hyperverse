# Cross-Platform Build Guide

This guide explains how to build Hyperverse for macOS, Windows, and Linux.

## Platform-Specific Build Scripts

### macOS (.dmg)
```bash
./rebuild-electron.sh
```
- Creates: `Hyperverse-{version}-arm64.dmg` (Apple Silicon) or `Hyperverse-{version}.dmg` (Intel)
- **Requires**: macOS computer

### Windows (.exe)
```bash
./rebuild-electron-windows.sh
```
- Creates: `Hyperverse Setup {version}.exe` (NSIS installer)
- **Can build on**: Windows, Linux (with Wine), or macOS (with Wine)

### Detect & Build for Current Platform
```bash
./rebuild-electron-all.sh
```
- Automatically detects your OS and builds for it
- Provides instructions for cross-compilation

## Cross-Compilation Setup

### Building Windows .exe on macOS/Linux
Install Wine:
```bash
# macOS
brew install --cask wine-stable

# Ubuntu/Debian
sudo apt-get install wine64
```

Then run:
```bash
npx electron-builder --win
```

### Building macOS .dmg on Linux
❌ **Not possible** - Apple code signing requires a Mac

### Building Linux AppImage on macOS/Windows
Install Docker and run:
```bash
docker run --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_TAG|TRAVIS|TRAVIS_REPO_|TRAVIS_BUILD_|TRAVIS_BRANCH|TRAVIS_PULL_REQUEST_|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
  --env ELECTRON_CACHE="/root/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "npm run build && npx tsc -p electron/tsconfig.json && npx electron-builder --linux"
```

## Icon Files

Before building, add platform-specific icons to the `build/` directory:

### macOS (.icns)
- File: `build/icon.icns`
- Format: 512x512px or larger, .icns format
- Create with: https://cloudconvert.com/png-to-icns

### Windows (.ico)
- File: `build/icon.ico`
- Format: 256x256px, .ico format with multiple sizes
- Create with: https://cloudconvert.com/png-to-ico

### Quick Icon Generation
```bash
# From a high-res PNG (1024x1024px recommended)
npm install -g electron-icon-builder
electron-icon-builder --input=./icon.png --output=./build
```

## Build Configuration

Build settings are in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.hyperverse.game",
    "productName": "Hyperverse",
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "category": "public.app-category.games"
    },
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

## Platform-Specific Behaviors

### Window Close Behavior
- **Windows/Linux**: App quits when window is closed
- **macOS**: 
  - Development: App stays running (dock icon remains)
  - Packaged: App quits when window is closed

This is controlled in `electron/main.ts`:
```typescript
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || app.isPackaged) {
    app.quit();
  }
});
```

### Local Server
All platforms use `http://localhost:45362` to serve the app, which:
- Fixes YouTube iframe postMessage issues
- Provides proper CORS for external content
- Works identically across all platforms

## Testing Builds

### macOS
```bash
open release/Hyperverse-{version}-arm64.dmg
```

### Windows
Double-click the `.exe` installer in the `release/` folder

### Linux
```bash
chmod +x release/Hyperverse-{version}.AppImage
./release/Hyperverse-{version}.AppImage
```

## Troubleshooting

### "Command not found: electron-builder"
```bash
npm install --save-dev electron-builder
```

### Windows build fails on macOS
Install Wine:
```bash
brew install --cask wine-stable
```

### App won't quit on macOS
- Expected in development mode (use Cmd+Q)
- Should quit properly in packaged .dmg

### YouTube iframe errors
If you see origin mismatch errors:
- The local server approach (`localhost:45362`) fixes this
- Ensure `webSecurity: true` in `electron/main.ts`

## CI/CD Considerations

For automated builds:
- **GitHub Actions**: Can build for all platforms using matrix strategy
- **macOS builds**: Require macOS runner
- **Windows builds**: Work on Windows or Linux runners (with Wine)
- **Linux builds**: Work on Linux runners or Docker

Example GitHub Actions matrix:
```yaml
strategy:
  matrix:
    os: [macos-latest, windows-latest, ubuntu-latest]
```
