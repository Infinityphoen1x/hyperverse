import { useState, useRef, useEffect } from "react";
import { queryClient } from "./lib/config/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initYouTubePlayer, initYouTubeTimeListener, buildYouTubeEmbedUrl } from "@/lib/youtube";
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from "@/lib/config/gameConstants";
import Home from "@/pages/Home";
import Game from "@/pages/Game";

function App() {
  const [gameActive, setGameActive] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const playerInitializedRef = useRef(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Capture filtered console logs for diagnostic download (optimized format)
  useEffect(() => {
    const logEntries: any[] = [];
    const startTime = Date.now();
    (window as any).__consoleLogs = logEntries;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Filter to only capture important logs, not spam
    const shouldCapture = (message: string): boolean => {
      // Always capture errors and warnings
      // Only capture logs with important tags
      return (
        message.includes('[CRITICAL]') ||
        message.includes('[ERROR]') ||
        message.includes('[WARN]') ||
        message.includes('[ENGINE]') ||
        message.includes('[RESUME]') ||
        message.includes('[SYNC]') ||
        message.includes('[FRAME]') ||
        message.includes('[GAME-OVER]') ||
        message.includes('[SYSTEM]')
      );
    };

    const captureLog = (level: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      if (level === 'error' || level === 'warn' || shouldCapture(message)) {
        logEntries.push({
          t: Date.now() - startTime,
          l: level,
          m: message
        });
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog('log', ...args);
    };
    console.warn = (...args) => {
      originalWarn(...args);
      captureLog('warn', ...args);
    };
    console.error = (...args) => {
      originalError(...args);
      captureLog('error', ...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const handleStartGame = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    setSelectedDifficulty(difficulty);
    setGameActive(true);
  };

  const handleBackToHome = () => {
    setGameActive(false);
  };

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
              <Home onStartGame={handleStartGame} />
            )}
            {gameActive && (
              <Game 
                difficulty={selectedDifficulty} 
                onBackToHome={handleBackToHome}
                youtubeIframeRef={youtubeIframeRef as React.RefObject<HTMLIFrameElement>}
                playerInitializedRef={playerInitializedRef}
              />
            )}
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
