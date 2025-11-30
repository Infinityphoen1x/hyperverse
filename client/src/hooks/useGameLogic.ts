import { useState, useEffect, useCallback, useRef } from "react";
import { Note, GameState } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo } from '@/lib/youtube';

interface UseGameLogicProps {
  gameState: GameState;
  currentTime: number;
  isPaused: boolean;
  notes: Note[];
  getVideoTime: (() => number | null) | undefined;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  startGame: () => void;
  setGameState: (state: GameState) => void;
  hitNote: (noteId: number) => void;
  trackHoldStart?: (noteId: number) => void;
  trackHoldEnd?: (noteId: number) => void;
  customNotes?: Note[];
  setPauseMenuOpen?: (open: boolean) => void;
  onHome?: () => void;
}

export function useGameLogic({
  gameState,
  currentTime,
  isPaused,
  notes,
  getVideoTime,
  pauseGame,
  resumeGame,
  restartGame,
  startGame,
  setGameState,
  hitNote,
  customNotes,
  setPauseMenuOpen,
}: UseGameLogicProps) {
  const [isPauseMenuOpen, setIsPauseMenuOpenLocal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [resumeFadeOpacity, setResumeFadeOpacity] = useState(0);
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const pauseTimeRef = useRef(0);
  const resumeStartTimeRef = useRef<number | null>(null);
  const errorCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameAlreadyStartedRef = useRef(false);
  const asyncReadyRef = useRef(false);
  const countdownStartedRef = useRef(false);

  const setPauseMenuOpenHandler = useCallback((open: boolean) => {
    setPauseMenuOpen?.(open);
    setIsPauseMenuOpenLocal(open);
  }, [setPauseMenuOpen]);

  // Deck handlers
  const handleLeftDeckSpin = useCallback(() => hitNote(-1), [hitNote]);
  const handleRightDeckSpin = useCallback(() => hitNote(-2), [hitNote]);

  // Resume handler - triggers 3-second countdown
  const handleResume = useCallback(() => {
    if (gameState === 'PAUSED') {
      countdownStartedRef.current = true;
      setCountdownSeconds(3);
    }
  }, [gameState]);

  // Countdown timer - fires once per second when paused
  useEffect(() => {
    if (gameState !== 'PAUSED' || countdownSeconds === 0) return;

    const interval = setInterval(() => {
      setCountdownSeconds(prev => {
        const newCount = Math.max(prev - 1, 0);
        console.log(`[COUNTDOWN] ${prev} → ${newCount}`);
        return newCount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, countdownSeconds]); // Re-run when either changes

  // Execute resume when countdown reaches 0
  useEffect(() => {
    if (countdownSeconds !== 0 || gameState !== 'PAUSED' || !countdownStartedRef.current) return;

    (async () => {
      console.log('[COUNTDOWN-COMPLETE] Starting resume sequence');
      countdownStartedRef.current = false; // Reset flag
      setPauseMenuOpenHandler(false);
      resumeGame();
      setGameState('RESUMING');
      setResumeFadeOpacity(0);
      resumeStartTimeRef.current = performance.now();

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Resume timeout')), 2000)
      );
      try {
        await Promise.race([
          (async () => {
            const pauseTimeSeconds = pauseTimeRef.current / 1000;
            await seekYouTubeVideo(pauseTimeSeconds);
            const confirmedTime = getVideoTime?.() ?? null;
            if (confirmedTime !== null) {
              console.log(`[RESUME] Synced to ${(confirmedTime / 1000).toFixed(2)}s`);
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            await playYouTubeVideo();
            return null;
          })(),
          timeoutPromise
        ]);
        asyncReadyRef.current = true;
      } catch (err) {
        console.error('[RESUME] Failed:', err);
        asyncReadyRef.current = true;
      }
    })();
  }, [countdownSeconds, gameState, resumeGame, setGameState, getVideoTime, setPauseMenuOpenHandler]);

  // Fade animation
  useEffect(() => {
    if (gameState !== 'RESUMING' || !asyncReadyRef.current) return;
    const fadeInDuration = 500;
    let animationFrameId: number;
    const animate = () => {
      if (!resumeStartTimeRef.current) return;
      const elapsed = performance.now() - resumeStartTimeRef.current;
      const progress = Math.min(elapsed / fadeInDuration, 1.0);
      setResumeFadeOpacity(progress);
      if (progress < 1.0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setGameState('PLAYING');
        setResumeFadeOpacity(1.0);
        asyncReadyRef.current = false;
        resumeStartTimeRef.current = null;
      }
    };
    setTimeout(() => {
      resumeStartTimeRef.current = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    }, 100);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, setGameState]);

  // Key Controls (useKeyControls equivalent)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[ESCAPE-KEY] Pressed - gameState:', gameState, 'isPaused:', isPaused, 'isPauseMenuOpen:', isPauseMenuOpen);
        if (gameState === 'PLAYING' && !isPaused) {
          console.log('[ESCAPE-KEY] Condition met: PLAYING && !isPaused → Pausing');
          pauseTimeRef.current = currentTime;
          pauseGame();
          (async () => {
            try {
              await pauseYouTubeVideo();
              await new Promise(resolve => setTimeout(resolve, 150));
              let youtubeTimeAtPause = null;
              for (let i = 0; i < 5; i++) {
                youtubeTimeAtPause = getVideoTime?.();
                if (youtubeTimeAtPause !== null) break;
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              pauseTimeRef.current = youtubeTimeAtPause || currentTime;
            } catch (err) {
              console.warn('[PAUSE] Failed:', err);
            }
            console.log('[ESCAPE-KEY] Setting gameState to PAUSED and opening menu');
            setGameState('PAUSED');
            setPauseMenuOpenHandler(true);
          })();
        } else if (gameState === 'PAUSED' && isPaused) {
          console.log('[ESCAPE-KEY] Condition met: PAUSED && isPaused → Starting resume countdown');
          setCountdownSeconds(3);
        } else {
          console.log('[ESCAPE-KEY] No condition met - gameState:', gameState, 'isPaused:', isPaused);
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        handleRewind();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, pauseGame, setGameState, getVideoTime, currentTime, setPauseMenuOpenHandler, isPauseMenuOpen]);

  // Rewind handler
  const handleRewind = useCallback(async () => {
    console.log('[REWIND] Initiating');
    restartGame();
    pauseTimeRef.current = 0;
    setPauseMenuOpenHandler(false);
    try {
      await pauseYouTubeVideo();
      await seekYouTubeVideo(0);
      await playYouTubeVideo(); // Play after seeking to 0
    } catch (err) {
      console.error('[REWIND] Failed:', err);
    }
    startGame();
  }, [restartGame, setPauseMenuOpenHandler, startGame]);

  // Time Sync (useTimeSync equivalent)
  useEffect(() => {
    if (gameState !== 'PLAYING' || !getVideoTime) return;
    const interval = setInterval(() => {
      const youtubeTime = getVideoTime();
      if (youtubeTime === null) return;
      const gameTime = currentTime;
      const drift = Math.abs(youtubeTime - gameTime);
      const driftPercent = gameTime > 0 ? (drift / gameTime) * 100 : 0;
      console.log(`[TIME-SYNC] YT: ${(youtubeTime/1000).toFixed(2)}s | Game: ${(gameTime/1000).toFixed(2)}s | Drift: ${drift.toFixed(0)}ms (${driftPercent.toFixed(1)}%)`);
      if (drift > 500) console.warn(`[TIME-SYNC] Large drift: ${drift.toFixed(0)}ms`);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, getVideoTime, currentTime]);

  // Error Monitoring (useErrorMonitoring equivalent)
  useEffect(() => {
    if (errorCheckIntervalRef.current) clearInterval(errorCheckIntervalRef.current);
    errorCheckIntervalRef.current = setInterval(() => {
      if (GameErrors.notes.length > 0) {
        setGameErrors([...GameErrors.notes]);
      }
      GameErrors.updateNoteStats(notes);
    }, 500);
    return () => {
      if (errorCheckIntervalRef.current) {
        clearInterval(errorCheckIntervalRef.current);
        errorCheckIntervalRef.current = null;
      }
    };
  }, [notes]);

  // Auto-start on notes load
  useEffect(() => {
    if (gameState !== 'IDLE' || !customNotes || customNotes.length === 0 || gameAlreadyStartedRef.current) return;
    gameAlreadyStartedRef.current = true;
    startGame(); // Assuming passed or global
  }, [customNotes, gameState]);

  // Reset on game state changes
  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      gameAlreadyStartedRef.current = false;
      countdownStartedRef.current = false;
      setPauseMenuOpenHandler(false);
    } else if (gameState === 'PLAYING') {
      // Reset countdown flag and close menu when resuming from pause
      countdownStartedRef.current = false;
      setCountdownSeconds(0);
      setPauseMenuOpenHandler(false);
    } else if (gameState === 'PAUSED') {
      asyncReadyRef.current = false;
    }
  }, [gameState, setPauseMenuOpenHandler]);

  return {
    isPauseMenuOpen,
    countdownSeconds,
    resumeFadeOpacity,
    gameErrors,
    handleLeftDeckSpin,
    handleRightDeckSpin,
    handleRewind,
    handleResume
  };
}