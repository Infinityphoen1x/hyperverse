# Electron .dmg Deployment Fix

## Issues Identified

### 1. **Absolute Path Problem** (PRIMARY ISSUE)
- The built `dist/public/index.html` contains absolute paths like `/assets/...` and `/icon.jpg`
- These absolute paths don't resolve correctly in Electron when using the `file://` protocol
- When packaged as a .dmg, the app window opens but assets fail to load

### 2. **Path Resolution in Packaged App**
- Electron-builder packages files into an ASAR archive at `app.asar`
- The correct path structure is: `Resources/app.asar/dist/public/`
- Original code wasn't properly accounting for this structure

### 3. **No Custom Protocol Handler**
- Standard `loadFile()` approach doesn't handle absolute paths in HTML gracefully
- Assets referenced with `/` prefix fail to resolve in packaged apps

## Solutions Implemented

### 1. Custom Protocol Handler (`app://`)
Added a custom protocol handler in [electron/main.ts](electron/main.ts) that:
- Registers the `app://` protocol to serve local files
- Handles both absolute paths (`/assets/...`) and relative paths (`assets/...`)
- Properly resolves file paths for both development and production
- Sets correct MIME types for all asset types (JS, CSS, images, fonts, audio)
- Includes comprehensive logging for debugging

### 2. Fixed Path Resolution
Updated the file loading logic to:
```typescript
const basePath = app.isPackaged 
  ? path.join(process.resourcesPath, 'app.asar', 'dist', 'public')
  : path.join(__dirname, '../dist/public');
```
This correctly locates files in both dev and production environments.

### 3. Smart Path Normalization
The protocol handler strips leading slashes from asset paths:
```typescript
const relativePath = decodedUrl.startsWith('/') ? decodedUrl.slice(1) : decodedUrl;
```
This means `/assets/index.js` becomes `assets/index.js` and resolves correctly.

## How It Works

1. **Development Mode** (`npm run dev`):
   - Protocol handler serves from: `electron/dist/../dist/public`
   - DevTools open automatically
   - Hot reload works normally

2. **Packaged App** (.dmg):
   - Protocol handler serves from: `Resources/app.asar/dist/public`
   - All assets resolve correctly regardless of path format
   - Console logging helps debug any issues

## Building the .dmg

Follow these steps to rebuild your .dmg with the fixes:

```bash
# 1. Clean previous builds (optional but recommended)
rm -rf release/ dist-electron/

# 2. Rebuild everything
npm run electron:build:mac
```

Or if you want to test in dev mode first:
```bash
# Test in development
npm run dev:client &
npx electron dist-electron/main.js
```

## What Changed

### Modified Files:
1. **[electron/main.ts](electron/main.ts)**
   - Added custom `app://` protocol handler
   - Updated imports to include `protocol`, `readFile`, `existsSync`
   - Fixed path resolution for packaged apps
   - Added comprehensive MIME type support
   - Added debug logging

2. **[dist-electron/main.js](dist-electron/main.js)**
   - Automatically generated from the TypeScript source
   - This is what actually runs in the packaged app

### Not Modified (but relevant):
- **[vite.config.ts](vite.config.ts)** - Already had `base: './'` set correctly
- **[package.json](package.json)** - Build config is correct

## Testing Checklist

After rebuilding the .dmg, verify:

- [ ] App launches without errors
- [ ] Main window displays with background color
- [ ] React components render correctly
- [ ] Images load (`icon.jpg`)
- [ ] Fonts load (Google Fonts, custom fonts)
- [ ] Audio files play (.wav files for sound effects)
- [ ] CSS styles apply correctly
- [ ] JavaScript executes without console errors
- [ ] Game functionality works end-to-end

## Debugging Tips

If issues persist:

1. **Check Console Output**: The app now logs detailed info about file loading
   ```
   Loading index from: ...
   Is packaged: true/false
   Protocol handler - requested: ...
   Protocol handler - resolved: ...
   Protocol handler - exists: true/false
   ```

2. **Open DevTools in Production**: Temporarily enable DevTools in packaged app:
   ```typescript
   // In electron/main.ts, comment out the condition:
   // if (!app.isPackaged) {
   mainWindow.webContents.openDevTools();
   // }
   ```

3. **Check File Structure**: Verify the ASAR contains your files:
   ```bash
   npx asar extract release/mac/Hyperverse.app/Contents/Resources/app.asar /tmp/extracted
   ls -R /tmp/extracted/dist/public
   ```

4. **Test with file:// protocol**: If the custom protocol fails, the fallback uses `loadFile()`
   - Check the console for "Falling back to loadFile..." message
   - This indicates protocol registration issue

## Alternative Approach (If Needed)

If the custom protocol approach has issues, you can alternatively:

1. **Fix HTML paths directly**: Create a post-build script to convert absolute to relative paths
2. **Use electron-devtools-installer**: For better debugging in production
3. **Disable ASAR**: Add `"asar": false` to package.json build config (not recommended for performance)

## Additional Notes

- The `base: './'` in vite.config.ts should theoretically make all paths relative, but doesn't always work with Vite's HTML plugin
- The custom protocol approach is more robust and commonly used in Electron apps
- This solution maintains compatibility with both dev and production environments
- The logging can be reduced or removed once everything works reliably

## Success Criteria

✅ App launches and shows Hyperverse UI
✅ All visual elements render correctly
✅ No "Failed to load resource" errors in console
✅ Game is fully playable in the packaged app
