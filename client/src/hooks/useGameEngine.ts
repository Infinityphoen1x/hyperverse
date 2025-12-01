import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note, Difficulty } from '@/types/game';

interface UseGameEngineProps {
  difficulty: Difficulty;
  customNotes?: Note[];
  getVideoTime?: () => number | null;
}

export interface UseGameEngineReturn {
  // State (reactive from store selectors)
  gameState: GameState;
  score: number;
  combo: number;
  health: number;
  notes: Note[];
  currentTime: number;
  isPaused: boolean;
  // Actions (store dispatches)
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  setGameState: (state: GameState) => void;
  // Input handlers (store dispatches)
  hitNote: (lane: number) => void;
  trackHoldStart: (lane: number) => void;
  trackHoldEnd: (lane: number) => void;
  markNoteMissed: (noteId: string) => void;
  // Utilities
  getReleaseTime: (noteId: string) => number | undefined;
}

export function useGameEngine({
  difficulty,
  customNotes = [],
  getVideoTime,
}: UseGameEngineProps): UseGameEngineReturn {
  const {
    gameState,
    score,
    combo,
    health,
    notes,
    currentTime,
    isPaused,
    setGameState,
    setCurrentTime,
    hitNote,
    startDeckHold,
    endDeckHold,
    pauseGame,
    resumeGame,
    rewindGame,
    restartGame
  } = useGameStore();

  const startGame = useCallback(() => {
    setGameState('PLAYING');
  }, [setGameState]);

  const markNoteMissed = useCallback((noteId: string) => {
    console.log(`[MISS] ${noteId}`);
  }, []);

  const getReleaseTime = useCallback((noteId: string) => {
    return undefined;
  }, []);

  // Video time sync
  useEffect(() => {
    if (!getVideoTime || gameState !== 'PLAYING' || isPaused) return;
    
    const interval = setInterval(() => {
      const videoTime = getVideoTime();
      if (videoTime !== null) {
        setCurrentTime(videoTime);
      }
    }, 16); // 60fps sync
    
    return () => clearInterval(interval);
  }, [getVideoTime, gameState, isPaused, setCurrentTime]);

  return {
    // State
    gameState,
    score,
    combo,
    health,
    notes,
    currentTime,
    isPaused,
    // Actions
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    setGameState,
    // Inputs
    hitNote,
    trackHoldStart: startDeckHold,
    trackHoldEnd: endDeckHold,
    markNoteMissed,
    // Utils
    getReleaseTime,
  };
}
