# Hyperverse - Build Instructions

## Prerequisites
✅ Electron and electron-builder are now installed

## Important: Platform Limitations

**You are currently in a Linux dev container (Codespaces):**
- ✅ Can build Windows (.exe) - works on Linux
- ❌ Cannot build macOS (.dmg) - requires actual macOS machine

To build the macOS .dmg, you need to run the build on your actual Mac after pulling the code.

## Build Commands

### For Windows (.exe) - Works in Codespaces:
```bash
npm run electron:build:win
```

### For macOS (.dmg) - Run on your Mac:
```bash
# On your Mac, after git pull:
npm install
npm run electron:build:mac
```

### For Both (on Mac only):
```bash
npm run electron:build
```

## Output
Your built apps will appear in:
```
release/
  ├── Hyperverse-1.0.0.dmg          # macOS installer
  └── Hyperverse Setup 1.0.0.exe    # Windows installer
```

## Icon Setup (Optional but Recommended)

1. Create a 1024x1024 PNG of your game logo/icon
2. Convert to platform formats:
   - **macOS**: Convert to .icns → place in `build/icon.icns`
   - **Windows**: Convert to .ico → place in `build/icon.ico`

Use online converters:
- https://cloudconvert.com/png-to-icns
- https://cloudconvert.com/png-to-ico

## Notes

- **macOS builds** can only be created on macOS (you're good!)
- **Windows builds** can be created on macOS if you have Wine installed:
  ```bash
  brew install wine-stable
  ```
- First build may take 5-10 minutes (downloads Electron binaries)
- Subsequent builds are faster (~2-3 minutes)

## Testing

Before distributing, test the .dmg on your Mac:
1. Open the .dmg file
2. Drag Hyperverse to Applications
3. Launch and verify all features work

## Distribution Size
- macOS .dmg: ~150-200 MB
- Windows .exe: ~180-220 MB

The size is due to bundling Chromium (needed for rendering your game).
