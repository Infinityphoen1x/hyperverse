import { useState, useEffect, useCallback, useRef } from "react";
import { Note, GameState } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { seekYouTubeVideo, playYouTubeVideo, pauseYouTubeVideo, waitForPlayerReady } from '@/lib/youtube';

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
  setCurrentTime: (time: number) => void;
  hitNote: (noteId: number) => void;
  trackHoldStart?: (noteId: number) => void;
  trackHoldEnd?: (noteId: number) => void;
  customNotes?: Note[];
  engineRef?: React.RefObject<any>;
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
  setCurrentTime,
  hitNote,
  customNotes,
  engineRef,
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
      setCountdownSeconds(prev => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, countdownSeconds]); // Re-run when either changes

  // Execute resume when countdown reaches 0
  useEffect(() => {
    if (countdownSeconds !== 0 || gameState !== 'PAUSED' || !countdownStartedRef.current) return;

    (async () => {
      countdownStartedRef.current = false;
      setPauseMenuOpenHandler(false);

      try {
        // Wait for player readiness (uses postMessage fallback if API not available)
        console.log('[RESUME] Waiting for YouTube player to be ready...');
        await waitForPlayerReady(2000);

        // Seek to correct time
        const targetTime = pauseTimeRef.current / 1000; // seconds
        console.log(`[RESUME] Seeking to ${targetTime.toFixed(2)}s`);
        await seekYouTubeVideo(targetTime);

        // Play video
        console.log('[RESUME] Playing video...');
        await playYouTubeVideo();

        // Sync engine currentTime
        const videoTimeMs = getVideoTime?.() ?? pauseTimeRef.current ?? 0;
        console.log(`[RESUME] Syncing engine to ${videoTimeMs.toFixed(0)}ms`);
        engineRef?.current?.setCurrentTime?.(videoTimeMs);
        setCurrentTime(videoTimeMs);

        setGameState('RESUMING');
        console.log('[RESUME-ANIM] Starting fade animation...');
        resumeStartTimeRef.current = performance.now();
        asyncReadyRef.current = true;

      } catch (err) {
        console.error('[RESUME DEBUG] Resume error:', err);
        // Still try to continue even if something failed
        const videoTimeMs = pauseTimeRef.current ?? 0;
        console.log(`[RESUME DEBUG] Continuing with fallback time: ${videoTimeMs.toFixed(0)}ms`);
        engineRef?.current?.setCurrentTime?.(videoTimeMs);
        setCurrentTime(videoTimeMs);
        setGameState('RESUMING');
        console.log('[RESUME-ANIM] Starting fade animation (fallback)...');
        resumeStartTimeRef.current = performance.now();
        asyncReadyRef.current = true;
      }
    })();
  }, [countdownSeconds, gameState]);

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
        if ((gameState === 'PLAYING' || gameState === 'RESUMING') && !isPaused) {
          // IMMEDIATELY set pause state before async YouTube operations
          pauseTimeRef.current = currentTime;
          pauseGame();
          setGameState('PAUSED');
          setPauseMenuOpenHandler(true);
          
          // Then do YouTube pause asynchronously
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
              // Pause failed, continue anyway
            }
          })();
        } else if (gameState === 'PAUSED' && isPaused) {
          countdownStartedRef.current = true;
          setCountdownSeconds(3);
        }
      } else if ((e.key === 'r' || e.key === 'R') && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
        handleRewind();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, pauseGame, setGameState, getVideoTime, currentTime, setPauseMenuOpenHandler]);

  // Rewind handler
  const handleRewind = useCallback(async () => {
    restartGame();
    pauseTimeRef.current = 0;
    setPauseMenuOpenHandler(false);
    try {
      await pauseYouTubeVideo();
      await seekYouTubeVideo(0);
      await playYouTubeVideo();
    } catch (err) {
      // Rewind failed, continue anyway
    }
    startGame();
  }, [restartGame, setPauseMenuOpenHandler, startGame]);

  // Time Sync (useTimeSync equivalent)
  useEffect(() => {
    if (gameState !== 'PLAYING' || !getVideoTime) return;
    const interval = setInterval(() => {
      const youtubeTime = getVideoTime();
      if (youtubeTime === null) return;
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