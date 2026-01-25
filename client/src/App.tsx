import { useState, useRef, useEffect } from "react";
import { queryClient } from "./lib/config/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useConsoleLogger } from "@/hooks/utils/useConsoleLogger";
import { initYouTubePlayer, initYouTubeTimeListener, destroyYouTubePlayer } from "@/lib/youtube";
import Home from "@/pages/Home";
import Game from "@/pages/Game";
import Settings from "@/pages/Settings";
import BeatmapEditor from "@/pages/BeatmapEditor";

function App() {
  const [gameActive, setGameActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const playerInitializedRef = useRef<boolean>(false) as React.RefObject<boolean>;
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Initialize console logging for diagnostics
  useConsoleLogger();

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

    // Cleanup: destroy player when videoId changes or component unmounts
    return () => {
      console.log('[APP-YOUTUBE-CLEANUP] Cleaning up YouTube player for videoId:', youtubeVideoId);
      destroyYouTubePlayer();
    };
  }, [youtubeVideoId]);

  // Get YouTube video ID from localStorage (set by Game component or Editor)
  useEffect(() => {
    const loadVideoId = () => {
      const pending = localStorage.getItem('pendingBeatmap');
      if (pending) {
        try {
          const data = JSON.parse(pending);
          if (data.youtubeVideoId) {
            console.log('[APP-YOUTUBE] Loading video ID from localStorage:', data.youtubeVideoId);
            setYoutubeVideoId(data.youtubeVideoId);
          }
        } catch (e) {
          console.warn('[APP-YOUTUBE] Failed to parse beatmap');
        }
      } else {
        // No beatmap in localStorage - clear video ID to unmount iframe
        setYoutubeVideoId(null);
      }
    };
    
    // Initial load
    loadVideoId();
    
    // Poll for changes every 500ms
    const interval = setInterval(loadVideoId, 500);
    
    // Listen for immediate updates from editor
    const handleBeatmapUpdate = () => {
      console.log('[APP-YOUTUBE] beatmapUpdate event received, loading video ID');
      loadVideoId();
    };
    window.addEventListener('beatmapUpdate', handleBeatmapUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beatmapUpdate', handleBeatmapUpdate);
    };
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

          {/* UI Layer - Home, Game, Settings, or Editor (z-10+) */}
          <div className="absolute inset-0 z-10">
            {settingsOpen && (
              <Settings onBack={() => setSettingsOpen(false)} />
            )}
            {editorOpen && (
              <BeatmapEditor onBack={() => setEditorOpen(false)} />
            )}
            {!gameActive && !settingsOpen && !editorOpen && (
              <Home 
                onStartGame={(difficulty) => { setSelectedDifficulty(difficulty); setGameActive(true); }} 
                onOpenSettings={() => setSettingsOpen(true)}
                onOpenEditor={() => setEditorOpen(true)}
              />
            )}
            {gameActive && (
              <Game 
                key={`game-${youtubeVideoId}-${selectedDifficulty}-${gameActive}`}
                difficulty={selectedDifficulty}
                onBackToHome={() => {
                  setGameActive(false);
                  // Keep iframe mounted - don't clear youtubeVideoId
                  // It will only be cleared when UNLOAD is pressed
                }}
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
