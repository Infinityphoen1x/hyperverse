import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameConfig,
  GameState,
  Note,
  Difficulty,
} from '@/lib/engine/gameTypes';
import { GameEngineCore } from '@/lib/engine/gameEngineCore';
import { MAX_HEALTH } from '@/lib/config/gameConstants';

// ============================================================================
// CONFIGURATION HOOK
// ============================================================================

export function useGameConfig(_difficulty: Difficulty): GameConfig {
  // In real implementation, load these from constants file
  return {
    TAP_HIT_WINDOW: 150,
    TAP_FAILURE_BUFFER: 100,
    HOLD_MISS_TIMEOUT: 500,
    HOLD_RELEASE_OFFSET: 200,
    HOLD_RELEASE_WINDOW: 150,
    HOLD_ACTIVATION_WINDOW: 300,
    LEAD_TIME: 2000,
    ACCURACY_PERFECT_MS: 50,
    ACCURACY_GREAT_MS: 100,
    ACCURACY_PERFECT_POINTS: 100,
    ACCURACY_GREAT_POINTS: 75,
    ACCURACY_NORMAL_POINTS: 50,
    MAX_HEALTH: MAX_HEALTH,
  };
}

// ============================================================================
// GAME LOOP HOOK - Handles requestAnimationFrame timing
// ============================================================================

interface GameLoopCallbacks {
  onFrame: (currentTime: number) => void;
  onGameOver?: () => void;
}

function useGameLoop(
  isActive: boolean,
  callbacks: GameLoopCallbacks
): void {
  const requestRef = useRef<number | undefined>(undefined);
  const callbacksRef = useRef<GameLoopCallbacks>(callbacks);

  // Keep callbacks fresh without restarting loop
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!isActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      return;
    }

    const loop = () => {
      callbacksRef.current.onFrame(performance.now());
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive]);
}

// ============================================================================
// STATE SYNC HOOK - Batches state updates to reduce re-renders
// ============================================================================

interface SyncConfig {
  notesInterval: number;
  stateInterval: number;
}

function useStateSynchronizer<T>(
  getValue: () => T,
  interval: number,
  isActive: boolean
): T {
  const [value, setValue] = useState<T>(getValue);
  const lastUpdateRef = useRef<number>(0);
  const valueRef = useRef<T>(getValue());

  useEffect(() => {
    if (!isActive) return;

    const checkUpdate = () => {
      const now = performance.now();
      if (now - lastUpdateRef.current >= interval) {
        const newValue = getValue();
        valueRef.current = newValue;
        setValue(newValue);
        lastUpdateRef.current = now;
      }
    };

    const intervalId = setInterval(checkUpdate, interval);
    return () => clearInterval(intervalId);
  }, [getValue, interval, isActive]);

  return value;
}

// ============================================================================
// MAIN GAME ENGINE HOOK
// ============================================================================

export interface UseGameEngineProps {
  difficulty: Difficulty;
  customNotes?: Note[];
  getVideoTime?: () => number | null;
  syncIntervals?: Partial<SyncConfig>;
}

export interface UseGameEngineReturn {
  // State
  gameState: GameState;
  score: number;
  combo: number;
  health: number;
  notes: Note[];
  currentTime: number;
  isPaused: boolean;
  
  // Actions
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  setGameState: (state: GameState) => void;
  
  // Input handlers
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
  const engineRef = useRef<GameEngineCore | null>(null);
  
  // Initialize engine
  if (!engineRef.current) {
    engineRef.current = new GameEngineCore(config, customNotes);
  }

  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Sync intervals with defaults
  const intervals = {
    notesInterval: syncIntervals.notesInterval || 50,
    stateInterval: syncIntervals.stateInterval || 100,
  };

  // Batch-synced state
  const isGameActive = gameState === 'PLAYING';
  
  const score = useStateSynchronizer(
    () => engineRef.current?.getScore().score || 0,
    intervals.stateInterval,
    isGameActive
  );
  
  const combo = useStateSynchronizer(
    () => engineRef.current?.getScore().combo || 0,
    intervals.stateInterval,
    isGameActive
  );
  
  const health = useStateSynchronizer(
    () => engineRef.current?.getScore().health || config.MAX_HEALTH,
    intervals.stateInterval,
    isGameActive
  );
  
  const notes = useStateSynchronizer(
    () => engineRef.current?.getNotes() || [],
    intervals.notesInterval,
    isGameActive
  );

  // Force notes refresh when resuming from pause
  useEffect(() => {
    if (!isPaused && gameState === 'PLAYING') {
      // Trigger a manual sync by creating a dependency on resume
      engineRef.current?.getNotes();
    }
  }, [isPaused, gameState]);

  // Game loop
  useGameLoop(gameState === 'PLAYING' && !isPaused, {
    onFrame: () => {
      const engine = engineRef.current;
      if (!engine) return;

      const videoTime = getVideoTime?.() ?? null;
      const time = engine.getCurrentTime(videoTime);
      
      setCurrentTime(time);
      
      const { shouldGameOver } = engine.processFrame(time);
      
      if (shouldGameOver) {
        setGameState('GAME_OVER');
      }
    },
  });

  // Actions
  const startGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.reset(customNotes);
    engine.start();
    
    setGameState('PLAYING');
    setIsPaused(false);
    setCurrentTime(0);
  }, [customNotes]);

  const pauseGame = useCallback(() => {
    engineRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    engineRef.current?.resume();
    setIsPaused(false);
  }, []);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  // Input handlers
  const hitNote = useCallback((lane: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    const time = engine.getCurrentTime(getVideoTime?.() ?? null);
    engine.handleTap(lane, time);
  }, [getVideoTime]);

  const trackHoldStart = useCallback((lane: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    const time = engine.getCurrentTime(getVideoTime?.() ?? null);
    engine.handleHoldStart(lane, time);
  }, [getVideoTime]);

  const trackHoldEnd = useCallback((lane: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    
    const time = engine.getCurrentTime(getVideoTime?.() ?? null);
    engine.handleHoldEnd(lane, time);
  }, [getVideoTime]);

  const markNoteMissed = useCallback((_noteId: string) => {
    // Legacy compatibility - could be implemented if needed
    console.warn('markNoteMissed is deprecated - auto-fail handles this');
  }, []);

  const getReleaseTime = useCallback((noteId: string) => {
    return engineRef.current?.getReleaseTime(noteId);
  }, []);

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
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed,
    getReleaseTime,
  };
}
