import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// YouTube IFrame API callback - MUST be defined on window before API loads
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
  }
}

window.onYouTubeIframeAPIReady = () => {
  console.log('YouTube IFrame API Ready');
};

createRoot(document.getElementById("root")!).render(<App />);
