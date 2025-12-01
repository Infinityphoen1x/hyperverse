import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note, Difficulty, GameConfig } from '@/types/game';
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { 
  LEAD_TIME, 
  MAX_HEALTH
} from '@/lib/config/gameConstants';

// Default config if constants are missing
const DEFAULT_CONFIG: GameConfig = {
  TAP_HIT_WINDOW: 100,
  TAP_FAILURE_BUFFER: 50,
  HOLD_MISS_TIMEOUT: 150,
  HOLD_RELEASE_OFFSET: 100,
  HOLD_RELEASE_WINDOW: 150,
  HOLD_ACTIVATION_WINDOW: 100,
  LEAD_TIME: 2000,
  ACCURACY_PERFECT_MS: 25,
  ACCURACY_GREAT_MS: 50,
  ACCURACY_PERFECT_POINTS: 300,
  ACCURACY_GREAT_POINTS: 100,
  ACCURACY_NORMAL_POINTS: 50,
  MAX_HEALTH: 200,
};

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
  const setNotes = useGameStore(state => state.setNotes);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  const hitNote = useGameStore(state => state.hitNote);
  const startDeckHold = useGameStore(state => state.startDeckHold);
  const endDeckHold = useGameStore(state => state.endDeckHold);
  const pauseGame = useGameStore(state => state.pauseGame);
  const resumeGame = useGameStore(state => state.resumeGame);
  const restartGameStore = useGameStore(state => state.restartGame);
  
  const setScore = useGameStore(state => state.setScore);
  const setCombo = useGameStore(state => state.setCombo);
  const setHealth = useGameStore(state => state.setHealth);

  // Construct GameConfig
  const gameConfig = useMemo<GameConfig>(() => ({
    ...DEFAULT_CONFIG,
    LEAD_TIME: LEAD_TIME || DEFAULT_CONFIG.LEAD_TIME,
    MAX_HEALTH: MAX_HEALTH || DEFAULT_CONFIG.MAX_HEALTH,
    // Map other constants if they exist, otherwise fallback
  }), []);

  // Initialize Engine Components
  const { processor, scorer } = useMemo(() => {
    const scorer = new ScoringManager(gameConfig);
    const validator = new NoteValidator(gameConfig);
    const processor = new NoteProcessor(gameConfig, validator, scorer);
    return { processor, scorer };
  }, [gameConfig]);

  // Sync scorer with store state on mount/change (if needed)
  // Actually, we should probably trust the store as source of truth if possible,
  // but Scorer is stateful. Let's just reset it on restart.

  // Store last frame timestamp for fallback timing
  const lastFrameTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (customNotes && customNotes.length > 0) {
        console.log(`[GAME-ENGINE] Loading ${customNotes.length} custom notes`);
        setNotes(customNotes);
    }
  }, [customNotes, setNotes]);

  const startGame = () => {
    setGameState('PLAYING');
    lastFrameTimeRef.current = performance.now();
  };

  const markNoteMissed = (noteId: string) => {
    console.log(`[MISS] ${noteId}`);
  };

  const getReleaseTime = (noteId: string): number | undefined => {
    return undefined;
  };

  const restartGame = useCallback(() => {
    scorer.reset();
    restartGameStore();
    lastFrameTimeRef.current = performance.now();
  }, [scorer, restartGameStore]);

  useEffect(() => {
    // Run loop if playing (even if video time is missing, we should fallback)
    if (gameState !== 'PLAYING' || isPaused) {
        lastFrameTimeRef.current = performance.now(); // Reset delta tracking
        return;
    }
    
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      let timeToUse: number | null = getVideoTime ? getVideoTime() : null;

      // Fallback: If video time is missing or 0 (stuck), and we are playing, use local delta
      // This ensures the game works even if YouTube fails
      if (timeToUse === null || (timeToUse === 0 && dt > 0)) {
          const currentStoreTime = useGameStore.getState().currentTime;
          // If we were at 0 and now falling back, start moving
          timeToUse = currentStoreTime + dt; 
          
          // Debug log occasionally
          if (Math.random() < 0.01) {
             console.log('[GAME-ENGINE] Using fallback local timing:', timeToUse.toFixed(0));
          }
      }

      if (timeToUse !== null) {
        setCurrentTime(timeToUse);
        
        const currentNotes = useGameStore.getState().notes;
        const result = processor.processNotesFrame(currentNotes, timeToUse);
        
        if (result.scoreState) {
             setScore(result.scoreState.score);
             setCombo(result.scoreState.combo);
             setHealth(result.scoreState.health);
        }

        if (result.updatedNotes !== currentNotes) {
             setNotes(result.updatedNotes);
        }
        
        if (result.shouldGameOver) {
            // setGameState('GAME_OVER'); // Optional: Enable later
        }
      }
    }, 16);
    
    return () => clearInterval(interval);
  }, [getVideoTime, gameState, isPaused, setCurrentTime, processor, setScore, setCombo, setHealth, setNotes, setGameState]);

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
