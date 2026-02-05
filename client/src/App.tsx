import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/config/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useConsoleLogger } from "@/hooks/utils/useConsoleLogger";
import Home from "@/pages/Home";
import { useBeatmapStore } from "@/stores/useBeatmapStore";
import { MotionProvider } from "@/lib/motion/MotionProvider";

// Lazy load heavy components
const Game = lazy(() => import("@/pages/Game"));
const Settings = lazy(() => import("@/pages/Settings"));
const BeatmapEditor = lazy(() => import("@/pages/BeatmapEditor"));
const Tutorial = lazy(() => import("@/pages/Tutorial"));

function App() {
  const [gameActive, setGameActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const playerInitializedRef = useRef<boolean>(false) as React.RefObject<boolean>;
  const youtubeVideoId = useBeatmapStore(state => state.youtubeVideoId);

  // Initialize console logging for diagnostics
  useConsoleLogger();

  // Initialize YouTube player when container mounts and videoId changes
  useEffect(() => {
    if (!youtubeContainerRef.current || !youtubeVideoId || !window.YT) return;

    // console.log('[APP-YOUTUBE-INIT] Initializing YouTube player for videoId:', youtubeVideoId);
    playerInitializedRef.current = false; // Reset for new video
    
    // Dynamic import to enable code splitting
    import('@/lib/youtube').then(({ initYouTubePlayer, initYouTubeTimeListener }) => {
      if (!youtubeContainerRef.current) return;
      
      initYouTubePlayer(youtubeContainerRef.current, youtubeVideoId, () => {
        // console.log('[APP-YOUTUBE-INIT] Player ready for videoId:', youtubeVideoId);
        playerInitializedRef.current = true;
      });
      initYouTubeTimeListener();
    });

    // Cleanup function for the useEffect
    return () => {
      // console.log('[APP-YOUTUBE-CLEANUP] Cleaning up YouTube player for videoId:', youtubeVideoId);
      import('@/lib/youtube').then(({ destroyYouTubePlayer }) => {
        destroyYouTubePlayer();
      });
    };
  }, [youtubeVideoId]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MotionProvider>
          <Toaster />
          {/* Persistent background container - never remounts */}
          <div className="fixed inset-0 w-full h-full bg-black" style={{ overflow: 'hidden', minHeight: '100vh', minWidth: '100vw' }}>
            {/* YouTube player - PERSISTENT background (z-0) - Hidden during tutorial */}
            {youtubeVideoId && (
              <div 
                className="absolute inset-0 pointer-events-none z-0"
                ref={youtubeContainerRef}
                style={{ display: 'block', opacity: tutorialOpen ? 0 : 0.15, width: '100%', height: '100%' }}
              />
            )}

            {/* UI Layer - Home, Game, Settings, or Editor (z-10+) */}
            <div className="absolute inset-0 z-10" style={{ overflow: 'hidden' }}>
              <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center text-white">Loading...</div>}>
                {settingsOpen && (
                  <Settings onBack={() => setSettingsOpen(false)} />
                )}
                {editorOpen && (
                  <BeatmapEditor 
                    onBack={() => setEditorOpen(false)}
                    playerInitializedRef={playerInitializedRef}
                  />
                )}
                {tutorialOpen && (
                  <Tutorial 
                    onBack={() => setTutorialOpen(false)}
                    playerInitializedRef={playerInitializedRef}
                  />
                )}
                {!gameActive && !settingsOpen && !editorOpen && !tutorialOpen && (
                  <Home 
                    onStartGame={(difficulty) => { setSelectedDifficulty(difficulty); setGameActive(true); }} 
                    onOpenSettings={() => setSettingsOpen(true)}
                    onOpenEditor={() => setEditorOpen(true)}
                    onOpenTutorial={() => setTutorialOpen(true)}
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
              </Suspense>
            </div>
          </div>
        </MotionProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
