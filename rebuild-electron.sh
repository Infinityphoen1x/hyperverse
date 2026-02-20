#!/bin/bash
# Rebuild Electron app for macOS
# Run this on your Mac after pulling the latest changes

set -e

echo "🔧 Rebuilding Hyperverse for macOS..."
echo ""

# Step 1: Build the frontend
echo "📦 Step 1/3: Building frontend (Vite)..."
npm run build

# Step 2: Compile Electron TypeScript
echo "⚡ Step 2/3: Compiling Electron main process..."
npx tsc -p electron/tsconfig.json

# Step 3: Package the app
echo "🍎 Step 3/3: Packaging macOS app..."
npx electron-builder --mac

echo ""
echo "✅ Build complete!"
echo "📦 Your app is ready at: release/Hyperverse-1.0.0.dmg"
echo ""
echo "🧪 To test, open the .dmg and drag Hyperverse to Applications"
