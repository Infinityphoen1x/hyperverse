import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useGameEngine, Difficulty, GameErrors, Note } from "@/lib/gameEngine";
import { getYouTubeVideoTime, buildYouTubeEmbedUrl, initYouTubePlayer, seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from "@/lib/youtubeUtils";
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from "@/lib/gameConstants";
import { CamelotWheel } from "@/components/game/CamelotWheel";
import { Down3DNoteLane } from "@/components/game/Down3DNoteLane";
import { DeckHoldMeters } from "@/components/game/DeckHoldMeters";
import { VisualEffects } from "@/components/game/VisualEffects";
import { ErrorLogViewer } from "@/components/game/ErrorLogViewer";
import { motion } from "framer-motion";

export default function Game() {
  const [leftDeckRotation, setLeftDeckRotation] = useState(0);
  const [rightDeckRotation, setRightDeckRotation] = useState(0);
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const errorCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Parse difficulty from URL with browser context check
  const difficulty = useMemo(() => {
    if (typeof window === 'undefined') return 'MEDIUM' as Difficulty;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      return (searchParams.get('difficulty') || 'MEDIUM') as Difficulty;
    } catch {
      return 'MEDIUM' as Difficulty;
    }
  }, []);
  
  // Function to get current video time from YouTube iframe
  // Uses utility function with robust error handling
  const getVideoTime = useCallback((): number | null => {
    const time = getYouTubeVideoTime(youtubeIframeRef.current);
    return time;
  }, [youtubeIframeRef]);
  
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const pausedTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const playerInitializedRef = useRef(false);
  
  const { 
    gameState, 
    score, 
    combo, 
    health, 
    notes, 
    currentTime, 
    isPaused,
    startGame, 
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed,
    pauseGame,
    resumeGame,
    restartGame
  } = useGameEngine(difficulty, youtubeVideoId ? getVideoTime : undefined, customNotes);

  // Memoize miss count to avoid filtering every render
  const missCount = useMemo(() => notes.filter(n => n.missed).length, [notes]);
  
  // Memoize score string formatting
  const scoreDisplay = useMemo(() => score.toString().padStart(6, '0'), [score]);

  // Keep currentTime in sync with ref for use in event handlers
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Initialize YouTube player when iframe is ready
  useEffect(() => {
    if (youtubeVideoId && youtubeIframeRef.current && !playerInitializedRef.current && window.YT) {
      initYouTubePlayer(youtubeIframeRef.current, () => {
        console.log('[INIT] YouTube player ready and initialized');
      });
      playerInitializedRef.current = true;
    }
  }, [youtubeVideoId]);

  // Clean up error check interval on unmount
  useEffect(() => {
    return () => {
      if (errorCheckIntervalRef.current) {
        clearInterval(errorCheckIntervalRef.current);
        errorCheckIntervalRef.current = null;
      }
    };
  }, []);

  // Monitor errors and note stats
  useEffect(() => {
    if (errorCheckIntervalRef.current) clearInterval(errorCheckIntervalRef.current);
    errorCheckIntervalRef.current = setInterval(() => {
      if (GameErrors.notes.length > 0) {
        setGameErrors([...GameErrors.notes]);
      }
      // Update note statistics for ErrorLogViewer
      GameErrors.updateNoteStats(notes);
    }, 500);
    return () => {
      if (errorCheckIntervalRef.current) {
        clearInterval(errorCheckIntervalRef.current);
        errorCheckIntervalRef.current = null;
      }
    };
  }, [notes]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // Memoize deck callbacks for visual rotation only (gameplay input from keyboard handler only)
  const handleLeftDeckSpin = useCallback(() => hitNote(-1), [hitNote]);
  const handleRightDeckSpin = useCallback(() => hitNote(-2), [hitNote]);

  // Load pending beatmap from localStorage on mount
  useEffect(() => {
    const pendingBeatmapStr = localStorage.getItem('pendingBeatmap');
    if (pendingBeatmapStr) {
      try {
        const beatmapData = JSON.parse(pendingBeatmapStr);
        if (beatmapData.youtubeVideoId) {
          setYoutubeVideoId(beatmapData.youtubeVideoId);
        }
        if (beatmapData.notes && beatmapData.notes.length > 0) {
          setCustomNotes(beatmapData.notes);
        }
        // Clear it so it doesn't reload on refresh
        localStorage.removeItem('pendingBeatmap');
      } catch (error) {
        console.error('Failed to load pending beatmap:', error);
        localStorage.removeItem('pendingBeatmap');
      }
    }
  }, []);

  // ESC key to pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'PLAYING') {
        if (isPaused) {
          const resumeTimeSeconds = pausedTimeRef.current / 1000;
          console.log('[PAUSE-SYSTEM] Resume: seeking YouTube to', resumeTimeSeconds, 'seconds');
          seekYouTubeVideo(resumeTimeSeconds);
          playYouTubeVideo();
          resumeGame();
          setIsPauseMenuOpen(false);
        } else {
          pausedTimeRef.current = currentTimeRef.current;
          const pauseTimeSeconds = pausedTimeRef.current / 1000;
          console.log('[PAUSE-SYSTEM] Pause: saving time', pausedTimeRef.current, 'ms, seeking YouTube to', pauseTimeSeconds);
          pauseGame();
          seekYouTubeVideo(pauseTimeSeconds);
          pauseYouTubeVideo();
          setIsPauseMenuOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, pauseGame, resumeGame]);

  // Restart game when beatmap is loaded (customNotes changes)
  useEffect(() => {
    if (customNotes && customNotes.length > 0) {
      startGame();
    }
  }, [customNotes, startGame]);

  if (gameState === 'GAMEOVER') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center space-y-8">
        <h1 className="text-6xl font-orbitron text-destructive neon-text-pink">SYSTEM CRITICAL</h1>
        <div className="text-2xl font-rajdhani">
          <p>FINAL SCORE: {score}</p>
          <p>MAX COMBO: {combo}</p>
          {gameErrors.length > 0 && (
            <div className="text-xs text-neon-yellow mt-4 max-h-20 overflow-y-auto">
              <p>ERRORS DETECTED: {gameErrors.length}</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-neon-blue text-black font-bold hover:bg-white transition-colors"
        >
          REBOOT SYSTEM
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col relative">
      {/* YouTube Background Layer - Auto-plays with audio for time sync */}
      {youtubeVideoId && (
        <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
          <iframe
            ref={youtubeIframeRef}
            width="480"
            height="270"
            src={buildYouTubeEmbedUrl(youtubeVideoId, { ...YOUTUBE_BACKGROUND_EMBED_OPTIONS })}
            title="YouTube background audio/video sync"
            allow="autoplay"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            data-testid="iframe-youtube-background"
          />
        </div>
      )}

      {/* Visual Effects Layer */}
      <VisualEffects combo={combo} health={health} missCount={missCount} />

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />


      {/* Pause Screen Overlay */}
      {isPauseMenuOpen && isPaused && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-8">
            <h1 className="text-6xl font-orbitron text-neon-cyan neon-glow">PAUSED</h1>
            <p className="text-neon-cyan font-rajdhani text-lg">Press ESC to resume</p>
            <div className="flex flex-col gap-4 mt-8">
              <button 
                onClick={() => {
                  const resumeTimeSeconds = pausedTimeRef.current / 1000;
                  console.log('[PAUSE-SYSTEM] RESUME button: seeking YouTube to', resumeTimeSeconds, 'seconds');
                  seekYouTubeVideo(resumeTimeSeconds);
                  playYouTubeVideo();
                  resumeGame();
                  setIsPauseMenuOpen(false);
                }}
                className="px-12 py-4 bg-neon-cyan text-black font-bold font-orbitron text-lg hover:bg-white transition-colors"
                data-testid="button-resume"
              >
                RESUME
              </button>
              <button 
                onClick={() => {
                  console.log('[PAUSE-SYSTEM] REWIND button: restarting game to 0');
                  pausedTimeRef.current = 0;
                  restartGame();
                  // Immediately pause to prevent game loop from running during YouTube sync
                  pauseGame();
                  seekYouTubeVideo(0);
                  pauseYouTubeVideo();
                  setIsPauseMenuOpen(false);
                }}
                className="px-12 py-4 bg-neon-yellow text-black font-bold font-orbitron text-lg hover:bg-white transition-colors border-2 border-neon-yellow"
                data-testid="button-rewind"
              >
                REWIND
              </button>
              <button 
                onClick={() => {
                  window.location.href = '/';
                }}
                className="px-12 py-4 bg-neon-pink text-black font-bold font-orbitron text-lg hover:bg-white transition-colors"
                data-testid="button-sever-node"
              >
                SEVER NODE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-neon-cyan flex items-center justify-center text-neon-cyan font-bold">
            {Math.floor((health / 200) * 100)}%
          </div>
          <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-cyan transition-all duration-300"
              style={{ width: `${(health / 200) * 100}%` }}
            />
          </div>
          {gameErrors.length > 0 && (
            <div className="text-xs text-neon-yellow font-rajdhani">
              {gameErrors.length} error(s)
            </div>
          )}
        </div>

        <div className="text-center">
          <motion.h2 
            className="text-4xl font-orbitron text-white tracking-widest tabular-nums neon-glow"
            animate={score % 500 === 0 && score > 0 ? { scale: [1, 1.2, 1], textShadow: ['0 0 10px white', '0 0 30px hsl(320, 100%, 60%)', '0 0 10px white'] } : {}}
            transition={{ duration: 0.3 }}
          >
            {scoreDisplay}
          </motion.h2>
          <p className="text-neon-pink font-rajdhani text-sm tracking-[0.5em] uppercase">score</p>
        </div>

        <div className="text-right flex items-center gap-4">
          <button
            onClick={() => {
              if (isPaused) {
                const resumeTimeSeconds = pausedTimeRef.current / 1000;
                console.log('[PAUSE-SYSTEM] Play button: seeking YouTube to', resumeTimeSeconds, 'seconds');
                seekYouTubeVideo(resumeTimeSeconds);
                playYouTubeVideo();
                resumeGame();
                setIsPauseMenuOpen(false);
              } else {
                pausedTimeRef.current = currentTimeRef.current;
                const pauseTimeSeconds = pausedTimeRef.current / 1000;
                console.log('[PAUSE-SYSTEM] Pause button: saving time', pausedTimeRef.current, 'ms, seeking YouTube to', pauseTimeSeconds);
                pauseGame();
                seekYouTubeVideo(pauseTimeSeconds);
                pauseYouTubeVideo();
                setIsPauseMenuOpen(true);
              }
            }}
            className="px-6 py-2 bg-neon-yellow/20 text-neon-yellow font-rajdhani text-sm hover:bg-neon-yellow/40 transition-colors rounded border border-neon-yellow"
            data-testid="button-pause"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          <motion.div 
            className="text-3xl font-bold font-orbitron neon-glow"
            style={{ color: combo % 20 === 0 && combo > 0 ? 'hsl(120, 100%, 50%)' : 'hsl(280, 100%, 60%)' }}
            animate={combo > 0 ? { scale: [1, 1.15, 1], rotate: combo % 10 === 0 ? [0, 5, -5, 0] : 0 } : {}}
            transition={{ duration: 0.3 }}
          >
            x{combo}
          </motion.div>
          <div className="text-xs text-white/50">COMBO</div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-4">
        
        {/* Left Deck */}
        <div className="hidden lg:block absolute left-8">
           <CamelotWheel 
             side="left" 
             onSpin={handleLeftDeckSpin}
             onRotationChange={setLeftDeckRotation}
           />
        </div>

        {/* Hold Meters Container */}
        <div className="hidden lg:block absolute left-[200px] right-[200px] top-1/2 -translate-y-1/2 h-48">
          <DeckHoldMeters 
            notes={notes} 
            currentTime={currentTime}
          />
        </div>

        {/* Center 3D Notelane with integrated soundpad buttons */}
        <div className="relative flex-1 flex items-center justify-center">
          <Down3DNoteLane 
            notes={notes} 
            currentTime={currentTime}
            health={health}
            combo={combo}
            onPadHit={hitNote}
            onDeckHoldStart={trackHoldStart}
            onDeckHoldEnd={trackHoldEnd}
          />
        </div>

        {/* Right Deck */}
        <div className="hidden lg:block absolute right-8">
           <CamelotWheel 
             side="right" 
             onSpin={handleRightDeckSpin}
             onRotationChange={setRightDeckRotation}
           />
        </div>

      </main>
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 w-full text-center text-white/20 text-xs">
        KEYS: [W] [O] [E] [I] FOR SOUNDPADS // [Q] [P] FOR DECKS
      </div>
      
      {/* Error Log Viewer */}
      <ErrorLogViewer />
    </div>
  );
}
