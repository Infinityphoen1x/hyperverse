// src/hooks/useGameEngine.ts
import { useEffect, useCallback } from 'react';
import { useGameEngineStore } from '@/stores/useGameEngineStore';
import { useSyncedValue } from './useSyncedValue'; // From prior migration
import { useGameConfig } from './useGameConfig';
import type { GameConfig, GameState, Note, Difficulty, ScoreState } from '@/lib/engine/gameTypes';
import { SyncConfig } from '@/lib/engine/gameTypes'; // Assume typed

interface UseGameEngineProps {
  difficulty: Difficulty;
  customNotes?: Note[];
  getVideoTime?: () => number | null;
  syncIntervals?: Partial<SyncConfig>;
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
  syncIntervals = {},
}: UseGameEngineProps): UseGameEngineReturn {
  const config = useGameConfig(difficulty);
  const {
    // State selectors
    gameState,
    isPaused,
    currentTime,
    getNotes,
    getScore,
    getReleaseTime: storeGetReleaseTime,
    // Actions
    init,
    start: startGame,
    pause: pauseGame,
    resume: resumeGame,
    reset: restartGame,
    setCurrentTime,
    handleTap: hitNote,
    handleHoldStart: trackHoldStart,
    handleHoldEnd: trackHoldEnd,
    // Assume markNoteMissed added to store if needed
    markNoteMissed,
  } = useGameEngineStore();

  // Synced values (batched for perf; use store selectors directly if no lag)
  const intervals = {
    notesInterval: syncIntervals.notesInterval || 50,
    stateInterval: syncIntervals.stateInterval || 16, // ~60fps for health/score
  };
  const isGameActive = gameState === 'PLAYING';

  const { score, combo, health } = getScore(); // Direct if no sync needed; else:
  // const syncedScore = useSyncedValue(useGameEngineStore, (state) => state.getScore().score, intervals.stateInterval, isGameActive);
  // const syncedCombo = useSyncedValue(useGameEngineStore, (state) => state.getScore().combo, intervals.stateInterval, isGameActive);
  // const syncedHealth = useSyncedValue(useGameEngineStore, (state) => state.getScore().health, intervals.stateInterval, isGameActive);

  // Init engine on mount (once)
  useEffect(() => {
    init(config, customNotes);
    console.log(`[GAME-ENGINE] Initialized with ${customNotes.length} notes`);
  }, [init, config, customNotes]);

  // Video time sync (poll if provided)
  useEffect(() => {
    if (!getVideoTime || !isGameActive) return;
    let interval: NodeJS.Timeout;
    interval = setInterval(() => {
      const videoTime = getVideoTime();
      if (videoTime !== null) {
        setCurrentTime(videoTime);
      }
    }, intervals.notesInterval);
    return () => clearInterval(interval);
  }, [getVideoTime, isGameActive, setCurrentTime, intervals.notesInterval]);

  // Legacy actions (dispatch to store; add setGameState if needed)
  const setGameState = useCallback((state: GameState) => {
    // e.g., useGameStore.getState().setGameState(state); or integrate into useGameEngineStore
  }, []);

  return {
    // State
    gameState,
    score: score, // Or syncedScore
    combo: combo, // Or syncedCombo
    health: health, // Or syncedHealth
    notes: getNotes(),
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
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed,
    // Utils
    getReleaseTime: storeGetReleaseTime,
  };
}
// src/hooks/useGameEngine.ts (snippet: add to UseGameEngineReturn and return)
export interface UseGameEngineReturn {
  // ... existing
  // Queries
  getActiveNotes: () => Note[];
  getCompletedNotes: () => Note[];
  getActiveNotesOnLane: (lane: number) => Note[];
  isDead: () => boolean;
}

export function useGameEngine({ ... }: UseGameEngineProps): UseGameEngineReturn {
  // ... existing
  const { getActiveNotes, getCompletedNotes, getActiveNotesOnLane, isDead } = useGameEngineStore();

  return {
    // ... existing state/actions
    getActiveNotes,
    getCompletedNotes,
    getActiveNotesOnLane,
    isDead,
  };
}