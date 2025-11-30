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
  const getValueRef = useRef(getValue);

  useEffect(() => {
    getValueRef.current = getValue;
  }, [getValue]);

  // Sync state - immediate on activation, then continuous
  useEffect(() => {
    if (!isActive) return;

    // Immediate sync
    const newValue = getValueRef.current();
    setValue(newValue);
    lastUpdateRef.current = performance.now();

    // Continuous sync
    const checkUpdate = () => {
      const now = performance.now();
      if (now - lastUpdateRef.current >= interval) {
        const newValue = getValueRef.current();
        setValue(newValue);
        lastUpdateRef.current = now;
      }
    };

    const intervalId = setInterval(checkUpdate, interval);
    return () => clearInterval(intervalId);
  }, [interval, isActive]);

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
  const justResumedRef = useRef(false);
  
  // Initialize engine
  if (!engineRef.current) {
    engineRef.current = new GameEngineCore(config, customNotes);
    console.log(`[GAME-ENGINE] Initialized with ${customNotes.length} notes`);
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
  
  // Notes always sync - engine maintains all state (combo, score, hit/missed status)
  // This ensures notes update properly through pause/resume cycle
  const notes = useStateSynchronizer(
    () => engineRef.current?.getNotes() || [],
    intervals.notesInterval,
    gameState === 'PLAYING' || gameState === 'PAUSED'
  );

  // Logging for debugging
  useEffect(() => {
    console.log(`[GAME-ENGINE-STATE] gameState=${gameState}, isPaused=${isPaused}, notes=${engineRef.current?.getNotes().length || 0}`);
  }, [gameState, isPaused]);

  // Game loop
  useGameLoop(gameState === 'PLAYING' && !isPaused, {
    onFrame: () => {
      const engine = engineRef.current;
      if (!engine) return;

      const videoTime = getVideoTime?.() ?? null;
      
      // CRITICAL: Sync engine timing on first frame after resume
      if (justResumedRef.current && videoTime !== null && videoTime > 0) {
        engine.syncToVideoTime(videoTime);
        justResumedRef.current = false;
        console.log(`[GAME-ENGINE-SYNC] Engine synced to YouTube time: ${videoTime.toFixed(0)}ms`);
      }
      
      const time = engine.getCurrentTime(videoTime);
      
      setCurrentTime(time);
      
      const { shouldGameOver } = engine.processFrame(time);

      console.log(
        `[GAME-DEBUG] currentTime=${time.toFixed(0)}ms`,
        'First note:',
        engine.getNotes()[0]?.time,
        'Active notes:',
        engine.getActiveNotes().length
      );
      
      if (shouldGameOver) {
        setGameState('GAME_OVER');
      }
    },
  });

  // Actions
  const startGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    console.log(`[GAME-ENGINE-START] Starting game with ${customNotes.length} notes`);
    engine.reset(customNotes);
    engine.start();
    
    setGameState('PLAYING');
    setIsPaused(false);
    setCurrentTime(0);
    console.log(`[GAME-ENGINE-START] Game started, engine notes=${engine.getNotes().length}`);
  }, [customNotes]);

  const pauseGame = useCallback(() => {
    engineRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    if (!isPaused) {
      console.log('[ENGINE] Resume skipped - already unpaused');
      return;
    }
    engineRef.current?.resume();
    setIsPaused(false);
    justResumedRef.current = true; // Flag for sync on next frame
    console.log('[GAME-ENGINE-RESUME] Resume executed - flagged for sync');
  }, [isPaused]);

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
