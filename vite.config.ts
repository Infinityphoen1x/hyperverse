import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  base: './', // Use relative paths for Electron compatibility
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      // Force all React imports to resolve to the same instance
      'react': path.resolve(import.meta.dirname, 'node_modules', 'react'),
      'react-dom': path.resolve(import.meta.dirname, 'node_modules', 'react-dom'),
    },
  },
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
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Only split node_modules - never split app code to avoid circular deps
          if (id.includes('node_modules')) {
            // DON'T split React - keep it in main entry to load first
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return undefined; // Include in main chunk
            }
            // Split other large vendor libraries
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }
            if (id.includes('zustand')) {
              return 'vendor-zustand';
            }
            // Catch-all for remaining node_modules
            return 'vendor-libs';
          }
          // Don't manually chunk app code - let Rollup handle it to avoid cycles
          return undefined;
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
