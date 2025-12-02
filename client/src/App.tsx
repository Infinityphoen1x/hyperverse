import { useState, useRef, useEffect } from "react";
import { queryClient } from "./lib/config/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useConsoleLogger } from "@/hooks/useConsoleLogger";
import { initYouTubePlayer, initYouTubeTimeListener, buildYouTubeEmbedUrl } from "@/lib/youtube";
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from "@/lib/config/gameConstants";
import Home from "@/pages/Home";
import Game from "@/pages/Game";

function App() {
  const [gameActive, setGameActive] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const playerInitializedRef = useRef<boolean>(false) as React.RefObject<boolean>;
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Initialize console logging for diagnostics
  useConsoleLogger();

  // Initialize YouTube player when iframe mounts or videoId changes
  useEffect(() => {
    if (!youtubeIframeRef.current || !window.YT) return;

    console.log('[APP-YOUTUBE-INIT] Initializing YouTube player for videoId:', youtubeVideoId);
    playerInitializedRef.current = false; // Reset for new video
    
    initYouTubePlayer(youtubeIframeRef.current, () => {
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
            <div className="absolute inset-0 pointer-events-none z-0">
              <iframe
                key={`youtube-${youtubeVideoId}`}
                ref={youtubeIframeRef}
                width="100%"
                height="100%"
                src={buildYouTubeEmbedUrl(youtubeVideoId, {
                  ...YOUTUBE_BACKGROUND_EMBED_OPTIONS,
                  autoplay: false
                })}
                title="YouTube background audio/video sync"
                allow="autoplay; encrypted-media"
                style={{ display: 'block', opacity: 0.05, width: '100%', height: '100%', objectFit: 'cover' as const }}
                data-testid="iframe-youtube-background"
              />
            </div>
          )}

          {/* UI Layer - Home or Game (z-10+) */}
          <div className="absolute inset-0 z-10">
            {!gameActive && (
              <Home onStartGame={(difficulty) => { setSelectedDifficulty(difficulty); setGameActive(true); }} />
            )}
            {gameActive && (
              <Game 
                key={`${youtubeVideoId}-${selectedDifficulty}`}
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
