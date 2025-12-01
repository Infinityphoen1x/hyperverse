import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note, Difficulty } from '@/types/game';

interface UseGameEngineProps {
  difficulty: Difficulty;
  customNotes?: Note[];
  getVideoTime?: () => number | null;
}

export interface UseGameEngineReturn {
  gameState: GameState;
  score: number;
  combo: number;
  health: number;
  notes: Note[];
  currentTime: number;
  isPaused: boolean;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  setGameState: (state: GameState) => void;
  hitNote: (lane: number) => void;
  trackHoldStart: (lane: number) => void;
  trackHoldEnd: (lane: number) => void;
  markNoteMissed: (noteId: string) => void;
  getReleaseTime: (noteId: string) => number | undefined;
}

export function useGameEngine({
  difficulty,
  customNotes = [],
  getVideoTime,
}: UseGameEngineProps): UseGameEngineReturn {
  const gameState = useGameStore(state => state.gameState);
  const score = useGameStore(state => state.score);
  const combo = useGameStore(state => state.combo);
  const health = useGameStore(state => state.health);
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  const isPaused = useGameStore(state => state.isPaused);
  const setGameState = useGameStore(state => state.setGameState);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  const hitNote = useGameStore(state => state.hitNote);
  const startDeckHold = useGameStore(state => state.startDeckHold);
  const endDeckHold = useGameStore(state => state.endDeckHold);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const restartGame = useGameStore(state => state.restartGame);

  const startGame = () => {
    setGameState('PLAYING');
  };

  const markNoteMissed = (noteId: string) => {
    console.log(`[MISS] ${noteId}`);
  };

  const getReleaseTime = (noteId: string): number | undefined => {
    return undefined;
  };

  useEffect(() => {
    if (!getVideoTime || gameState !== 'PLAYING' || isPaused) return;
    
    const interval = setInterval(() => {
      const videoTime = getVideoTime();
      if (videoTime !== null) {
        setCurrentTime(videoTime);
      }
    }, 16);
    
    return () => clearInterval(interval);
  }, [getVideoTime, gameState, isPaused, setCurrentTime]);

  return {
    gameState,
    score,
    combo,
    health,
    notes,
    currentTime,
    isPaused,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    setGameState,
    hitNote,
    trackHoldStart: startDeckHold,
    trackHoldEnd: endDeckHold,
    markNoteMissed,
    getReleaseTime,
  };
}
