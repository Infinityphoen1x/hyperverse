import { createRoot } from "react-dom/client";
import * as React from "react";
import App from "./App";
import "./index.css";

// DIAGNOSTIC LOGGING
console.log("=== ELECTRON DIAGNOSTIC START ===");
console.log("Environment:", {
  userAgent: navigator.userAgent,
  isElectron: navigator.userAgent.includes('Electron'),
  protocol: window.location.protocol,
  origin: window.location.origin,
  href: window.location.href
});

console.log("React availability:", {
  React: typeof React,
  ReactKeys: React ? Object.keys(React).slice(0, 10) : 'undefined',
  useState: typeof React?.useState,
  useEffect: typeof React?.useEffect,
  useLayoutEffect: typeof React?.useLayoutEffect,
  createRoot: typeof createRoot
});

// Check if any React hooks are undefined
if (!React || !React.useLayoutEffect) {
  console.error("CRITICAL: React or hooks are undefined!", {
    React,
    hasUseLayoutEffect: React?.useLayoutEffect !== undefined
  });
}

console.log("=== ELECTRON DIAGNOSTIC END ===");

// YouTube IFrame API callback - MUST be defined on window before API loads
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

window.onYouTubeIframeAPIReady = () => {
  console.log('YouTube IFrame API Ready');
};

try {
  createRoot(document.getElementById("root")!).render(<App />);
  console.log("React app rendered successfully");
} catch (error) {
  console.error("Failed to render React app:", error);
}
