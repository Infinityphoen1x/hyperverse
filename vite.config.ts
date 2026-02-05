import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    metaImagesPlugin(),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      open: false, // Set to true to auto-open in browser
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split large dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            // Other node_modules
            return 'vendor-libs';
          }
          
          // Zustand stores - state management
          if (id.includes('/stores/')) {
            return 'stores';
          }
          
          // Game engine - note processing, validators, game logic
          if (id.includes('/lib/engine/') || 
              id.includes('/lib/notes/') ||
              id.includes('/lib/beatmap/') ||
              id.includes('/hooks/game/')) {
            return 'game-engine';
          }
          
          // Editor - editor-specific code
          if (id.includes('/pages/BeatmapEditor') ||
              id.includes('/hooks/editor/') ||
              id.includes('/components/editor/')) {
            return 'editor';
          }
          
          // YouTube player
          if (id.includes('/lib/youtube/')) {
            return 'youtube';
          }
          
          // Visual effects and rendering
          if (id.includes('/components/game/effects/') ||
              id.includes('/hooks/effects/') ||
              id.includes('/lib/geometry/')) {
            return 'effects';
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
