import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useGameEngine, Difficulty, GameErrors, Note } from "@/lib/gameEngine";
import { getYouTubeVideoTime, buildYouTubeEmbedUrl, initYouTubePlayer, seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo, initYouTubeTimeListener } from "@/lib/youtubeUtils";
import { YOUTUBE_BACKGROUND_EMBED_OPTIONS } from "@/lib/gameConstants";
import { CamelotWheel } from "@/components/game/CamelotWheel";
import { Down3DNoteLane } from "@/components/game/Down3DNoteLane";
import { DeckHoldMeters } from "@/components/game/DeckHoldMeters";
import { VisualEffects } from "@/components/game/VisualEffects";
import { ErrorLogViewer } from "@/components/game/ErrorLogViewer";
import { CountdownOverlay } from "@/components/game/CountdownOverlay";
import { motion } from "framer-motion";

interface GameProps {
  difficulty: Difficulty;
  onBackToHome?: () => void;
  youtubeIframeRef: React.RefObject<HTMLIFrameElement>;
  playerInitializedRef: React.MutableRefObject<boolean>;
}

export default function Game({ difficulty, onBackToHome, youtubeIframeRef, playerInitializedRef }: GameProps) {
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();
  const [resumeFadeOpacity, setResumeFadeOpacity] = useState(0);
  const errorCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeStartTimeRef = useRef<number | null>(null);
  
  // Function to get current video time from YouTube player
  // Uses utility function with robust error handling
  const getVideoTime = useCallback((): number | null => {
    const time = getYouTubeVideoTime();
    return time;
  }, []);
  
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [startupCountdown, setStartupCountdown] = useState(0);
  const currentTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const gameAlreadyStartedRef = useRef(false);
  const [asyncReady, setAsyncReady] = useState(false);
  const countdownDurationRef = useRef(3); // Dynamic countdown duration based on beatmapStart

  // Calculate countdown duration from first note's beatmapStart
  const calculateCountdownDuration = (notesToCheck: Note[] | undefined): number => {
    if (!notesToCheck || notesToCheck.length === 0) return 3; // Default fallback
    
    // Find the minimum beatmapStart from all notes
    let minBeatmapStart = Infinity;
    for (const note of notesToCheck) {
      if (note.beatmapStart !== undefined && note.beatmapStart > 0) {
        minBeatmapStart = Math.min(minBeatmapStart, note.beatmapStart);
      }
    }
    
    // Convert ms to seconds, with minimum of 1 second
    const durationSeconds = Math.max(1, Math.ceil(minBeatmapStart / 1000));
    console.log(`[COUNTDOWN-CALC] beatmapStart: ${minBeatmapStart}ms → countdown: ${durationSeconds}s`);
    return durationSeconds;
  };
  
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

  // Auto-seek to 0 during COUNTDOWN when videoId is set
  useEffect(() => {
    if (!youtubeVideoId || !playerInitializedRef.current || gameState !== 'COUNTDOWN') return;

    const autoSeek = async () => {
      try {
        await seekYouTubeVideo(0);
        console.log('[YOUTUBE-AUTO-SEEK] Complete during COUNTDOWN');
      } catch (err) {
        console.warn('[YOUTUBE-AUTO-SEEK] Failed:', err);
      }
    };
    autoSeek();
  }, [youtubeVideoId, gameState, playerInitializedRef]);

  // Startup countdown (when game starts) - PLAY ON COUNTDOWN ENTRY (gesture window)
  // UPDATED: Call play immediately on COUNTDOWN entry (synchronous gesture), then display countdown
  useEffect(() => {
    if (gameState !== 'COUNTDOWN' || isPaused) {
      console.log('[STARTUP-COUNTDOWN-EFFECT] Skipped: gameState=' + gameState + ', isPaused=' + isPaused);
      return;
    }

    // CRITICAL: Play on COUNTDOWN entry - inherits gesture from startGame() call
    if (startupCountdown === 0 && youtubeVideoId && playerInitializedRef.current) {
      console.log('[STARTUP-COUNTDOWN-EFFECT] COUNTDOWN entered - initiating play within gesture window');
      // Fire-and-forget play (non-blocking)
      playYouTubeVideo()
        .then(() => console.log('[STARTUP-COUNTDOWN-EFFECT] Play started within gesture'))
        .catch(err => {
          console.warn('[STARTUP-COUNTDOWN-EFFECT] Play failed:', err);
          // Fallback: Try synthetic gesture
          const tempBtn = document.createElement('button');
          tempBtn.style.position = 'fixed';
          tempBtn.style.opacity = '0';
          tempBtn.style.pointerEvents = 'none';
          tempBtn.onclick = () => playYouTubeVideo().catch(console.warn);
          document.body.appendChild(tempBtn);
          tempBtn.click();
          document.body.removeChild(tempBtn);
          console.log('[STARTUP-COUNTDOWN-EFFECT] Fallback gesture triggered');
        });
    }

    // Countdown complete → transition to PLAYING
    if (engineCountdown <= 0 && startupCountdown > 0) {
      console.log('[STARTUP-COUNTDOWN-EFFECT] Countdown complete, transitioning to PLAYING');
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
  // UPDATED: Resume countdown effect - Timeout-wrapped async chain
  useEffect(() => {
    if (countdownSeconds <= 0 || gameState !== 'PAUSED') return;
    const timer = setTimeout(async () => {
      if (countdownSeconds === 1) {
        console.log('[RESUME-COUNTDOWN-EFFECT] Starting timed resume sequence');
        setIsPauseMenuOpen(false);
        resumeGame();
        setGameState('RESUMING');
        setCountdownSeconds(0);
        setStartupCountdown(0);
        setResumeFadeOpacity(0);
        resumeStartTimeRef.current = performance.now();

        const timeoutPromise: Promise<null> = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Resume timeout: YT API hung')), 2000)
        );
        try {
          // Chain with race: Inner returns null to match
          await Promise.race<null>([
            (async () => {
              const pauseTimeSeconds = pauseTimeRef.current / 1000;
              await seekYouTubeVideo(pauseTimeSeconds); // Polls internally
              const confirmedTime = getYouTubeVideoTime();
              if (confirmedTime !== null) {
                currentTimeRef.current = confirmedTime; // Sync engine
                console.log(`[RESUME-COUNTDOWN-EFFECT] Synced to ${(confirmedTime / 1000).toFixed(2)}s`);
              }
              await new Promise(resolve => setTimeout(resolve, 50)); // Buffer
              await playYouTubeVideo(); // Now polls state
              return null; // NEW: Explicit null return to match type
            })(),
            timeoutPromise
          ]);
          console.log('[RESUME-COUNTDOWN-EFFECT] Async chain complete');
          setAsyncReady(true); // Trigger fade
        } catch (err) {
          console.error('[RESUME-COUNTDOWN-EFFECT] Chain failed (timeout/fallback):', err);
          // Fallback: Force sync from last known (prevents total stall)
          currentTimeRef.current = pauseTimeRef.current;
          setAsyncReady(true); // Proceed with fade
        }
      } else {
        setCountdownSeconds(prev => prev - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdownSeconds, gameState, resumeGame, setGameState, pauseTimeRef]);
  // Handle RESUMING fade-in animation (0.5s)
  // UPDATED: Handle RESUMING fade-in animation (0.5s) - Start only after async
  useEffect(() => {
    if (gameState !== 'RESUMING' || !asyncReady) return; // Wait for chain
    const fadeInDuration = 500;
    let animationFrameId: number;
    const animate = () => {
      if (!resumeStartTimeRef.current) return;
      const elapsed = performance.now() - resumeStartTimeRef.current;
      const progress = Math.min(elapsed / fadeInDuration, 1.0); // Caps at 1.0, no drift from lag
      setResumeFadeOpacity(progress);
      if (progress < 1.0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        console.log('[RESUMING-FADE-EFFECT] Complete, to PLAYING');
        setGameState('PLAYING');
        setResumeFadeOpacity(1.0);
        setAsyncReady(false); // Reset
        resumeStartTimeRef.current = null;
      }
    };
    // NEW: Micro-delay for post-async settle
    setTimeout(() => {
      resumeStartTimeRef.current = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    }, 100);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, setGameState, asyncReady]); // Dep on asyncReady



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

  // Compare YouTube time vs game engine time (every 1s during PLAYING)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const comparisonInterval = setInterval(() => {
      const youtubeTime = getYouTubeVideoTime();
      const gameTime = currentTimeRef.current;

      if (youtubeTime === null) {
        console.log(`[TIME-SYNC] YouTube: null (not tracked) | Game: ${(gameTime/1000).toFixed(2)}s`);
        return;
      }
      const drift = Math.abs(youtubeTime - gameTime);
      const driftPercent = gameTime > 0 ? (drift / gameTime) * 100 : 0; // Guard zero-div
      console.log(`[TIME-SYNC] YouTube: ${(youtubeTime/1000).toFixed(2)}s | Game: ${(gameTime/1000).toFixed(2)}s | Drift: ${drift.toFixed(0)}ms (${driftPercent.toFixed(1)}%)`);

      if (drift > 500) {
        console.warn(`[TIME-SYNC-WARNING] Large drift detected: ${drift.toFixed(0)}ms!`);
      }
    }, 1000);
    return () => clearInterval(comparisonInterval);
  }, [gameState]);
  
  useEffect(() => {
    if (gameState === 'PAUSED') {
      setAsyncReady(false);
      console.log('[ASYNC-READY] Reset on PAUSED entry');
    }
  }, [gameState]);

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
        if (gameState === 'PLAYING' && !isPaused) {
          const pauseTimeMs = currentTimeRef.current;
          pauseTimeRef.current = pauseTimeMs; // Temp fallback
          pauseGame();
          // Pause video and update pause time
          (async () => {
            try {
              await pauseYouTubeVideo();
              // UPDATED: Longer settle time for getCurrentTime to sync
              await new Promise(resolve => setTimeout(resolve, 150));
              // Poll for accurate YT time post-pause with more attempts
              let youtubeTimeAtPause = null;
              for (let i = 0; i < 5; i++) {
                youtubeTimeAtPause = getYouTubeVideoTime();
                if (youtubeTimeAtPause !== null) {
                  console.log(`[PAUSE-SYSTEM] Got YT time on attempt ${i + 1}: ${(youtubeTimeAtPause / 1000).toFixed(2)}s`);
                  break;
                }
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              pauseTimeRef.current = youtubeTimeAtPause || pauseTimeMs; // YT or game fallback
              console.log(`[PAUSE-SYSTEM] Paused at YT: ${youtubeTimeAtPause ? (youtubeTimeAtPause / 1000).toFixed(2) + 's' : 'game fallback ' + (pauseTimeMs / 1000).toFixed(2) + 's'}`);
            } catch (err) {
              console.warn('[PAUSE-SYSTEM] Pause failed:', err);
            }
            setGameState('PAUSED');
            setIsPauseMenuOpen(true);
          })();
        } else if (gameState === 'PAUSED' && isPaused) {
          setCountdownSeconds(3);
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        console.log('[REWIND-SYSTEM] Initiating rewind');
        restartGame(); // Reset game engine state
        pauseTimeRef.current = 0;
        setIsPauseMenuOpen(false);
        
        // Fire-and-forget: Rewind video in background
        const doRewind = async () => {
          try {
            await pauseYouTubeVideo();
            await seekYouTubeVideo(0);
            console.log('[REWIND-SYSTEM] Seek complete');
          } catch (err) {
            console.error('[REWIND-SYSTEM] Rewind failed:', err);
          }
        };
        doRewind();
        
        // Call startGame() with dynamic countdown duration based on beatmapStart
        const countdownDuration = calculateCountdownDuration(customNotes);
        startGame(countdownDuration);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, pauseGame, restartGame, setGameState]);

  // Start game when beatmap is loaded - ONLY on initial load from IDLE state, never after pause/resume
  useEffect(() => {
    if (gameState !== 'IDLE') return;
    if (customNotes && customNotes.length > 0 && !gameAlreadyStartedRef.current) {
      console.log('[BEATMAP-LOAD] Starting - seeking first');
      gameAlreadyStartedRef.current = true;
      if (youtubeVideoId && playerInitializedRef.current) {
        seekYouTubeVideo(0).catch(console.warn); // Seek on mounted player
      }
      const countdownDuration = calculateCountdownDuration(customNotes);
      startGame(countdownDuration); // Then countdown with dynamic duration based on beatmapStart
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
                  console.log('[PAUSE-MENU] REWIND: Restarting game like R key');
                  restartGame(); // Reset game engine state
                  pauseTimeRef.current = 0;
                  setIsPauseMenuOpen(false);
                  
                  // Fire-and-forget: Rewind video in background
                  const doRewind = async () => {
                    try {
                      await pauseYouTubeVideo();
                      await seekYouTubeVideo(0);
                      console.log('[PAUSE-MENU] Seek complete');
                    } catch (err) {
                      console.error('[PAUSE-MENU] Rewind failed:', err);
                    }
                  };
                  doRewind();
                  
                  // Call startGame() with dynamic countdown duration based on beatmapStart
                  const countdownDuration = calculateCountdownDuration(customNotes);
                  startGame(countdownDuration);
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
