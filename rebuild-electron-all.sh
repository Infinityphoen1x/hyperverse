#!/bin/bash
# Rebuild Electron app for all platforms (macOS, Windows, Linux)
# Note: Building for macOS requires a Mac, Windows requires Windows or Wine

set -e

echo "🔧 Rebuilding Hyperverse for multiple platforms..."
echo ""

# Step 0: Auto-increment version
echo "🔢 Step 0/5: Incrementing version..."
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📌 New version: $NEW_VERSION"
echo ""

# Step 1: Build the frontend
echo "📦 Step 1/5: Building frontend (Vite)..."
npm run build

# Step 2: Compile Electron TypeScript
echo "⚡ Step 2/5: Compiling Electron main process..."
npx tsc -p electron/tsconfig.json

# Step 3: Package for detected platform
echo "📦 Step 3/5: Detecting platform and building..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building for macOS..."
    npx electron-builder --mac
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Building for Linux..."
    npx electron-builder --linux
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Building for Windows..."
    npx electron-builder --win
else
    echo "⚠️  Unknown platform, building for current platform..."
    npx electron-builder
fi

# Step 4: Optionally build for other platforms (requires cross-compilation setup)
echo ""
echo "💡 Step 4/5: Cross-platform builds (optional)..."
echo "   To build for other platforms, run:"
echo "   - macOS:   npx electron-builder --mac"
echo "   - Windows: npx electron-builder --win"
echo "   - Linux:   npx electron-builder --linux"
echo ""

# Step 5: Clean up old versions
echo "🧹 Step 5/5: Cleaning up old builds..."
cd release
# Keep only the 3 most recent installers of each type
ls -t *.dmg 2>/dev/null | tail -n +4 | xargs -r rm 2>/dev/null || true
ls -t *.exe 2>/dev/null | tail -n +4 | xargs -r rm 2>/dev/null || true
ls -t *.AppImage 2>/dev/null | tail -n +4 | xargs -r rm 2>/dev/null || true
cd ..

echo ""
echo "✅ Build complete!"
echo "📦 Check the release/ directory for your installers"
echo ""
