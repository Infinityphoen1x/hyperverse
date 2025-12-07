import { useState, useRef, useEffect } from "react";
import { queryClient } from "./lib/config/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useConsoleLogger } from "@/hooks/useConsoleLogger";
import { initYouTubePlayer, initYouTubeTimeListener } from "@/lib/youtube";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Settings from "@/pages/Settings";

function App() {
  const [gameActive, setGameActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const playerInitializedRef = useRef<boolean>(false) as React.RefObject<boolean>;
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Initialize console logging for diagnostics
  useConsoleLogger();

  // Clear stale beatmap data on initial app mount (prevents auto-load from previous sessions)
  useEffect(() => {
    localStorage.removeItem('pendingBeatmap');
  }, []); // Empty deps = runs once on mount

  // Initialize YouTube player when container mounts and videoId changes
  useEffect(() => {
    if (!youtubeContainerRef.current || !youtubeVideoId || !window.YT) return;

    console.log('[APP-YOUTUBE-INIT] Initializing YouTube player for videoId:', youtubeVideoId);
    playerInitializedRef.current = false; // Reset for new video
    
    initYouTubePlayer(youtubeContainerRef.current, youtubeVideoId, () => {
      console.log('[APP-YOUTUBE-INIT] Player ready for videoId:', youtubeVideoId);
      playerInitializedRef.current = true;
    });
    initYouTubeTimeListener();
  }, [youtubeVideoId]);

  // Get YouTube video ID from localStorage (set by Game component)
  useEffect(() => {
    const loadVideoId = () => {
      const pending = localStorage.getItem('pendingBeatmap');
      if (pending) {
        try {
          const data = JSON.parse(pending);
          if (data.youtubeVideoId) {
            setYoutubeVideoId(data.youtubeVideoId);
          }
        } catch (e) {
          console.warn('[APP-YOUTUBE] Failed to parse beatmap');
        }
      }
    };
    loadVideoId();
    const interval = setInterval(loadVideoId, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* Persistent background container - never remounts */}
        <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
          {/* YouTube player - PERSISTENT background (z-0) */}
          {youtubeVideoId && (
            <div 
              className="absolute inset-0 pointer-events-none z-0"
              ref={youtubeContainerRef}
              style={{ display: 'block', opacity: 0.05, width: '100%', height: '100%' }}
            />
          )}

          {/* UI Layer - Home, Game, or Settings (z-10+) */}
          <div className="absolute inset-0 z-10">
            {settingsOpen && (
              <Settings onBack={() => setSettingsOpen(false)} />
            )}
            {!gameActive && !settingsOpen && (
              <Home onStartGame={(difficulty) => { setSelectedDifficulty(difficulty); setGameActive(true); }} onOpenSettings={() => setSettingsOpen(true)} />
            )}
            {gameActive && (
              <Game 
                key={`game-${youtubeVideoId}-${selectedDifficulty}-${gameActive}`}
                difficulty={selectedDifficulty}
                onBackToHome={() => setGameActive(false)}
                playerInitializedRef={playerInitializedRef}
                youtubeVideoId={youtubeVideoId}
              />
            )}
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
