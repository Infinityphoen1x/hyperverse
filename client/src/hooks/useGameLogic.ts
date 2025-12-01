import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note } from '@/types/game';
import { usePauseLogic } from './usePauseLogic';
import { useKeyControls } from './useKeyControls';
import { useCountdown } from './useCountdown';
import { useFadeAnimation } from './useFadeAnimation';
import { useAutoStart } from './useAutoStart';
import { useRewind } from './useRewind';

interface UseGameLogicProps {
  gameState: GameState;
  currentTime: number;
  isPaused: boolean;
  notes: Note[];
  getVideoTime?: (() => number | null) | null;
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
  onHome,
}: UseGameLogicProps) {
  const [isPauseMenuOpen, setIsPauseMenuOpenLocal] = useState(false);
  const [resumeFadeOpacity, setResumeFadeOpacity] = useState(0);

  const setPauseMenuOpenHandler = useCallback((open: boolean) => {
    setPauseMenuOpen?.(open);
    setIsPauseMenuOpenLocal(open);
  }, [setPauseMenuOpen]);

  // Deck handlers
  const handleLeftDeckSpin = useCallback(() => hitNote(-1), [hitNote]);
  const handleRightDeckSpin = useCallback(() => hitNote(-2), [hitNote]);

  // Pause logic
  const { pauseGame: pauseHandler, handleResume } = usePauseLogic({
    gameState,
    currentTime,
    getVideoTime,
    engineRef,
    setCurrentTime,
    setGameState,
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Rewind (must be declared before useKeyControls)
  const handleRewind = useRewind({ restartGame, startGame, setPauseMenuOpen: setPauseMenuOpenHandler });

  // Key controls
  useKeyControls({
    gameState,
    isPaused,
    hitNote,
    handleRewind,
    handleResume,
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Countdown
  useCountdown({
    gameState,
    onCountdownComplete: handleResume, // Or dispatch
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Fade animation
  useFadeAnimation({
    gameState,
    resumeGame,
    setGameState,
    setResumeFadeOpacity,
  });


  // Auto-start
  useAutoStart({ customNotes, startGame });

  // Reset on game state changes
  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      setIsPauseMenuOpenLocal(false);
    } else if (gameState === 'PLAYING') {
      setIsPauseMenuOpenLocal(false);
    } else if (gameState === 'PAUSED') {
      // Pause-specific
    }
  }, [gameState]);

  return {
    isPauseMenuOpen,
    countdownSeconds: useGameStore(s => s.countdownSeconds), // From store
    resumeFadeOpacity,
    handleLeftDeckSpin,
    handleRightDeckSpin,
    handleRewind,
    handleResume,
    pauseGame: pauseHandler,
  };
}