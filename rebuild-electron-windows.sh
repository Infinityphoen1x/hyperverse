#!/bin/bash
# Rebuild Electron app for Windows
# Run this to build the Windows .exe installer

set -e

echo "🔧 Rebuilding Hyperverse for Windows..."
echo ""

# Step 0: Auto-increment version
echo "🔢 Step 0/4: Incrementing version..."
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📌 New version: $NEW_VERSION"
echo ""

# Step 1: Build the frontend
echo "📦 Step 1/4: Building frontend (Vite)..."
npm run build

# Step 2: Compile Electron TypeScript
echo "⚡ Step 2/4: Compiling Electron main process..."
npx tsc -p electron/tsconfig.json

# Step 3: Package the app
echo "🪟 Step 3/4: Packaging Windows app..."
npx electron-builder --win

# Step 4: Clean up old versions
echo "🧹 Step 4/4: Cleaning up old builds..."
cd release
# Keep only the 3 most recent .exe files
ls -t *.exe 2>/dev/null | tail -n +4 | xargs -r rm
cd ..

echo ""
echo "✅ Build complete!"
echo "📦 Your app is ready at: release/Hyperverse Setup ${NEW_VERSION}.exe"
echo ""
