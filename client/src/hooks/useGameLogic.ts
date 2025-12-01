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
  getVideoTime?: (() => number | null) | null;
  resumeGame: () => void;
  restartGame: () => void;
  startGame: () => void;
  setGameState: (state: GameState) => void;
  setCurrentTime: (time: number) => void;
  hitNote: (noteId: number) => void;
  customNotes?: Note[];
  engineRef?: React.RefObject<any>;
  setPauseMenuOpen?: (open: boolean) => void;
}

interface UseGameLogicReturn {
  isPauseMenuOpen: boolean;
  countdownSeconds: number;
  resumeFadeOpacity: number;
  handleLeftDeckSpin: () => void;
  handleRightDeckSpin: () => void;
  handleRewind: () => void;
  handleResume: () => void;
  pauseGame: () => void;
}

export function useGameLogic({
  gameState,
  currentTime,
  getVideoTime,
  resumeGame,
  restartGame,
  startGame,
  setGameState,
  setCurrentTime,
  hitNote,
  customNotes,
  engineRef,
  setPauseMenuOpen,
}: UseGameLogicProps): UseGameLogicReturn {
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
    getVideoTime: getVideoTime ?? undefined,
    engineRef,
    setCurrentTime,
    setGameState,
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Rewind (must be declared before useKeyControls)
  const handleRewind = useRewind({ restartGame, startGame, setPauseMenuOpen: setPauseMenuOpenHandler });

  // Key controls
  useKeyControls({
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Countdown
  useCountdown({
    gameState,
    onCountdownComplete: handleResume,
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
  useAutoStart({ customNotes: customNotes ?? [], startGame });

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