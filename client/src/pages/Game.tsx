import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useGameEngine, Difficulty, GameErrors, Note } from "@/lib/gameEngine";
import { getYouTubeVideoTime, buildYouTubeEmbedUrl, initYouTubePlayer, seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from "@/lib/youtubeUtils";
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from "@/lib/gameConstants";
import { CamelotWheel } from "@/components/game/CamelotWheel";
import { Down3DNoteLane } from "@/components/game/Down3DNoteLane";
import { DeckHoldMeters } from "@/components/game/DeckHoldMeters";
import { VisualEffects } from "@/components/game/VisualEffects";
import { ErrorLogViewer } from "@/components/game/ErrorLogViewer";
import { CountdownOverlay } from "@/components/game/CountdownOverlay";
import { motion } from "framer-motion";

export default function Game() {
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();
  const [resumeFadeOpacity, setResumeFadeOpacity] = useState(0);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const errorCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeStartTimeRef = useRef<number | null>(null);
  
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
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [startupCountdown, setStartupCountdown] = useState(0);
  const currentTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const playerInitializedRef = useRef(false);
  const gameAlreadyStartedRef = useRef(false);
  
  const { 
    gameState, 
    score, 
    combo, 
    health, 
    notes, 
    currentTime, 
    isPaused,
    countdownSeconds: engineCountdown,
    startGame, 
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    pauseGame,
    resumeGame,
    restartGame,
    setGameState
  } = useGameEngine(difficulty, youtubeVideoId ? getVideoTime : undefined, customNotes);

  // Memoize miss count to avoid filtering every render
  const missCount = useMemo(() => notes.filter(n => n.missed).length, [notes]);
  
  // Memoize score string formatting
  const scoreDisplay = useMemo(() => score.toString().padStart(6, '0'), [score]);

  // Keep currentTime in sync with ref for use in event handlers
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Startup countdown (when game starts) - skip if paused or not in countdown state
  useEffect(() => {
    // Only run during actual COUNTDOWN state, never during PLAYING/PAUSED
    if (gameState !== 'COUNTDOWN' || isPaused) {
      console.log('[STARTUP-COUNTDOWN-EFFECT] Skipped: gameState=' + gameState + ', isPaused=' + isPaused);
      return;
    }
    
    // Only handle countdown completion once - check if we already transitioned
    if (engineCountdown <= 0 && startupCountdown > 0) {
      // Countdown complete - start the game
      console.log('[STARTUP-COUNTDOWN-EFFECT] Countdown complete, transitioning to PLAYING');
      if (youtubeVideoId && playerInitializedRef.current) {
        console.log('[STARTUP-COUNTDOWN-EFFECT] YouTube autoplay resuming');
        playYouTubeVideo().catch(err => console.warn('[STARTUP-COUNTDOWN-EFFECT] playYouTubeVideo failed:', err));
      }
      setGameState('PLAYING');
      setStartupCountdown(0);
      return;
    }

    // Update display countdown - only if we still have time
    if (engineCountdown > 0 && startupCountdown !== engineCountdown) {
      setStartupCountdown(engineCountdown);
      console.log(`[STARTUP-COUNTDOWN-EFFECT] Displaying ${engineCountdown}s remaining`);
    }
  }, [gameState, engineCountdown, youtubeVideoId, setGameState, isPaused, startupCountdown]);

  // Pause menu countdown timer (before resume)
  useEffect(() => {
    if (countdownSeconds <= 0 || gameState !== 'PAUSED') return;

    const timer = setTimeout(() => {
      if (countdownSeconds === 1) {
        // Countdown complete - transition to RESUMING
        console.log('[RESUME-COUNTDOWN-EFFECT] Countdown complete, transitioning to RESUMING');
        setIsPauseMenuOpen(false);
        console.log('[RESUME-COUNTDOWN-EFFECT] Pause menu closed');
        resumeGame();
        console.log('[RESUME-COUNTDOWN-EFFECT] Timing recalibrated via resumeGame()');
        setGameState('RESUMING');
        setCountdownSeconds(0);
        setStartupCountdown(0);
        setResumeFadeOpacity(0);
        resumeStartTimeRef.current = performance.now();
        console.log('[RESUME-COUNTDOWN-EFFECT] Starting 0.5s fade-in overlay, state=RESUMING');
        // Seek YouTube to pauseTime position before playing
        const pauseTimeSeconds = pauseTimeRef.current / 1000;
        console.log(`[RESUME-COUNTDOWN-EFFECT] Seeking YouTube to pauseTime=${pauseTimeRef.current}ms (${pauseTimeSeconds.toFixed(2)}s)`);
        seekYouTubeVideo(pauseTimeSeconds).catch(err => console.warn('[RESUME-COUNTDOWN-EFFECT] seekYouTubeVideo failed:', err));
        // Play YouTube at pauseTime position
        playYouTubeVideo().catch(err => console.warn('[RESUME-COUNTDOWN-EFFECT] playYouTubeVideo failed:', err));
        console.log('[RESUME-COUNTDOWN-EFFECT] YouTube playVideo() called from paused position');
      } else {
        setCountdownSeconds(prev => prev - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdownSeconds, gameState, resumeGame, setGameState]);

  // Handle RESUMING fade-in animation (0.5s)
  useEffect(() => {
    if (gameState !== 'RESUMING') return;

    const fadeInDuration = 500; // 0.5 seconds
    let animationFrameId: number;

    const animate = () => {
      if (!resumeStartTimeRef.current) return;
      
      const elapsed = performance.now() - resumeStartTimeRef.current;
      const progress = Math.min(elapsed / fadeInDuration, 1.0);
      
      setResumeFadeOpacity(progress);
      
      if (progress < 1.0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Fade-in complete - transition to PLAYING
        console.log('[RESUMING-FADE-EFFECT] Fade-in complete, transitioning to PLAYING');
        setGameState('PLAYING');
        setResumeFadeOpacity(1.0);
        resumeStartTimeRef.current = null;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, setGameState]);

  // Handle REWINDING transition to COUNTDOWN
  useEffect(() => {
    if (gameState !== 'REWINDING') return;

    // Small delay to ensure YouTube seek completes before transitioning to countdown
    const timer = setTimeout(() => {
      console.log('[REWIND-EFFECT] Rewind complete, transitioning to COUNTDOWN');
      setGameState('COUNTDOWN');
      setStartupCountdown(3);
    }, 100);

    return () => clearTimeout(timer);
  }, [gameState, setGameState]);

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


  // Deck hit callbacks (keyboard: Q for left deck, P for right deck)
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

  // ESC key to pause/resume, R key to rewind
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // PAUSE: PLAYING → PAUSED
        if (gameState === 'PLAYING' && !isPaused) {
          const pauseTimeMs = currentTimeRef.current;
          const pauseTimeSec = (pauseTimeMs / 1000).toFixed(2);
          console.log(`[PAUSE-SYSTEM] PAUSE: Freezing at gameTime=${pauseTimeMs}ms (${pauseTimeSec}s)`);
          pauseTimeRef.current = pauseTimeMs;
          pauseGame();
          setGameState('PAUSED');
          setStartupCountdown(0);
          pauseYouTubeVideo().catch(err => console.warn('[PAUSE-SYSTEM] pauseYouTubeVideo failed:', err));
          console.log(`[PAUSE-SYSTEM] YouTube paused`);
          setIsPauseMenuOpen(true);
        }
        // RESUME: PAUSED → PLAYING (handled by pause menu countdown)
        else if (gameState === 'PAUSED' && isPaused) {
          console.log('[PAUSE-SYSTEM] RESUME: Starting 3s pause menu countdown');
          setCountdownSeconds(3);
        }
      }
      // R key to rewind from any active state
      else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        console.log('[REWIND-SYSTEM] REWIND initiated: Seeking to 0:00, resetting score/combo/notes');
        restartGame();
        setGameState('REWINDING');
        setIsPauseMenuOpen(false);
        pauseYouTubeVideo().catch(err => console.warn('[REWIND-SYSTEM] pauseYouTubeVideo failed:', err));
        console.log('[REWIND-SYSTEM] Seeking YouTube to 0:00');
        seekYouTubeVideo(0).catch(err => console.warn('[REWIND-SYSTEM] seekYouTubeVideo failed:', err));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, pauseGame, restartGame, setGameState]);

  // Start game when beatmap is loaded - ONLY on initial load from IDLE state, never after pause/resume
  useEffect(() => {
    // Only start on initial beatmap load from IDLE state
    if (gameState !== 'IDLE') return;
    if (customNotes && customNotes.length > 0 && !gameAlreadyStartedRef.current) {
      console.log('[BEATMAP-LOAD] New beatmap loaded from IDLE, starting game via startGame()');
      gameAlreadyStartedRef.current = true;
      startGame();
      // During COUNTDOWN: seek YouTube to 0:00, pause it
      // Countdown effect will handle pause/play coordination
      if (youtubeVideoId && playerInitializedRef.current) {
        seekYouTubeVideo(0).catch(err => console.warn('[GAME-START] seekYouTubeVideo failed:', err));
        console.log('[GAME-START] Seeking YouTube to 0:00 for countdown');
      }
    }
  }, [customNotes, gameState, startGame, youtubeVideoId]);

  // Reset flag when game ends
  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      gameAlreadyStartedRef.current = false;
    }
  }, [gameState]);

  if (gameState === 'GAME_OVER') {
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
      {/* Startup countdown overlay - ONLY for initial startGame() and rewind, NEVER during pause/resume */}
      {gameState === 'COUNTDOWN' && startupCountdown > 0 && !isPaused && <CountdownOverlay seconds={startupCountdown} />}
      
      {/* Resume fade-in overlay (0.5s) - NO countdown, smooth transition */}
      {gameState === 'RESUMING' && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: resumeFadeOpacity }}
          transition={{ duration: 0 }}
        />
      )}
      
      {/* YouTube Background Layer - Only render after COUNTDOWN to prevent audio playback during countdown */}
      {youtubeVideoId && gameState !== 'COUNTDOWN' && (
        <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
          <iframe
            key={`youtube-${youtubeVideoId}`}
            ref={youtubeIframeRef}
            width="480"
            height="270"
            src={buildYouTubeEmbedUrl(youtubeVideoId, { 
              ...YOUTUBE_BACKGROUND_EMBED_OPTIONS,
              autoplay: gameState === 'PLAYING'
            })}
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
            {countdownSeconds > 0 ? (
              <>
                <motion.div
                  className="text-9xl font-orbitron text-neon-cyan neon-glow"
                  animate={{ scale: [1, 1.2, 1], textShadow: ['0 0 20px hsl(180, 100%, 50%)', '0 0 40px hsl(180, 100%, 50%)', '0 0 20px hsl(180, 100%, 50%)'] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  key={countdownSeconds}
                >
                  {countdownSeconds}
                </motion.div>
                <p className="text-neon-cyan font-rajdhani text-lg">GET READY!</p>
              </>
            ) : (
              <>
                <h1 className="text-6xl font-orbitron text-neon-cyan neon-glow">PAUSED</h1>
                <p className="text-neon-cyan font-rajdhani text-lg">Press ESC to resume</p>
              </>
            )}
            <div className="flex flex-col gap-4 mt-8">
              <button 
                onClick={() => {
                  setCountdownSeconds(3);
                }}
                disabled={countdownSeconds > 0}
                className="px-12 py-4 bg-neon-cyan text-black font-bold font-orbitron text-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-resume"
              >
                {countdownSeconds > 0 ? 'RESUMING...' : 'RESUME'}
              </button>
              <button 
                onClick={() => {
                  if (!isPaused || gameState !== 'PAUSED') return;
                  console.log('[PAUSE-MENU] REWIND: use R key or press button');
                  // Trigger rewind via keyboard handler logic
                  restartGame();
                  setGameState('REWINDING');
                  setIsPauseMenuOpen(false);
                  pauseYouTubeVideo();
                  seekYouTubeVideo(0);
                }}
                className="px-12 py-4 bg-emerald-500 text-black font-bold font-orbitron text-lg hover:bg-white transition-colors border-2 border-emerald-500"
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
           />
        </div>

        {/* Hold Meters Container */}
        <div className="hidden lg:block absolute left-[200px] right-[200px] top-1/2 -translate-y-1/2 h-48">
          <DeckHoldMeters 
            notes={notes} 
            currentTime={Math.round(currentTime)}
          />
        </div>

        {/* Center 3D Notelane with integrated soundpad buttons - only show during PLAYING/PAUSED */}
        {gameState !== 'COUNTDOWN' && (
          <div className="relative flex-1 flex items-center justify-center">
            <Down3DNoteLane 
              notes={notes} 
              currentTime={Math.round(currentTime)}
              health={health}
              combo={combo}
              onPadHit={hitNote}
              onDeckHoldStart={trackHoldStart}
              onDeckHoldEnd={trackHoldEnd}
            />
          </div>
        )}

        {/* Right Deck */}
        <div className="hidden lg:block absolute right-8">
           <CamelotWheel 
             side="right" 
             onSpin={handleRightDeckSpin}
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
