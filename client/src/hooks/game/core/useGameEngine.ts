import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note, Difficulty, GameConfig } from '@/types/game';
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { RotationManager } from '@/lib/managers/rotationManager';
import { GameErrors } from '@/lib/errors/errorLog';
import { GAME_CONFIG } from '@/lib/config';
import { useGameInput } from '@/hooks/game/input/useGameInput';
import { checkRotationTriggers } from '@/hooks/effects/tunnel/useRotationTriggers';

// Default config from single source of truth
const DEFAULT_CONFIG: GameConfig = GAME_CONFIG as GameConfig;


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
  hitNote: (lane: number) => void; // lane: Position value (-2 to 3)
  trackHoldStart: (lane: number) => boolean; // lane: Position value (-2 to 3)
  trackHoldEnd: (lane: number) => void; // lane: Position value (-2 to 3)
  markNoteMissed: (noteId: string) => void;
  getReleaseTime: (noteId: string) => number | undefined;
  resetScorer: () => void;
  resetRotation: () => void;
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
  const setMissCount = useGameStore(state => state.setMissCount);

  const beatmapBpm = useGameStore(state => state.beatmapBpm) || 120;

  // Construct GameConfig from single source of truth
  const gameConfig = useMemo<GameConfig>(() => DEFAULT_CONFIG, []);

  const { processor, validator, scorer, rotationManager } = useMemo(() => {
    const scorer = new ScoringManager(gameConfig);
    const validator = new NoteValidator(gameConfig);
    const processor = new NoteProcessor(gameConfig, validator, scorer);
    const rotationManager = new RotationManager();
    return { processor, validator, scorer, rotationManager };
  }, [gameConfig]);

  // Store last frame timestamp for fallback timing
  const lastFrameTimeRef = useRef<number>(performance.now());
  
  // YouTube time smoothing to reduce jitter from IFrame API
  const lastYouTubeTimeRef = useRef<number | null>(null);
  const smoothedYouTubeTimeRef = useRef<number | null>(null);
  const lastYouTubeUpdateRef = useRef<number>(performance.now());

  useEffect(() => {
    if (customNotes && customNotes.length > 0) {
        setNotes(customNotes);
        GameErrors.updateNoteStats(customNotes);
    }
  }, [customNotes, setNotes]);

  const startGame = () => {
    setGameState('PLAYING');
    lastFrameTimeRef.current = performance.now();
  };

  const markNoteMissed = (noteId: string) => {
    // console.log(`[MISS] ${noteId}`);
  };

  const getReleaseTime = (noteId: string): number | undefined => {
    return undefined;
  };

  const resetScorer = useCallback(() => {
    scorer.reset();
  }, [scorer]);

  const resetRotation = useCallback(() => {
    rotationManager.reset();
  }, [rotationManager]);

  const restartGame = useCallback(() => {
    scorer.reset();
    rotationManager.reset();
    restartGameStore();
    lastFrameTimeRef.current = performance.now();
  }, [scorer, rotationManager, restartGameStore]);

  // Input handling (extracted to useGameInput hook)
  const { handleHitNote, handleTrackHoldStart, handleTrackHoldEnd } = useGameInput({
    processor,
    validator,
    rotationManager,
  });

  // Game loop using requestAnimationFrame for proper screen sync
  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) {
        lastFrameTimeRef.current = performance.now();
        return;
    }
    
    let animationFrameId: number;
    let lastRenderTime = 0;
    
    const gameLoop = () => {
      const now = performance.now();
      
      // FPS throttling
      const targetFPS = useGameStore.getState().targetFPS;
      if (targetFPS > 0) {
        const targetFrameTime = 1000 / targetFPS;
        if (now - lastRenderTime < targetFrameTime) {
          animationFrameId = requestAnimationFrame(gameLoop);
          return; // Skip this frame
        }
      }
      lastRenderTime = now;
      
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      let timeToUse: number | null = getVideoTime ? getVideoTime() : null;
      
      // Apply YouTube time smoothing if we have a valid time
      if (timeToUse !== null && timeToUse > 0) {
        const timeSinceLastUpdate = now - lastYouTubeUpdateRef.current;
        
        // If this is a new YouTube time value (differs from last)
        if (lastYouTubeTimeRef.current === null || Math.abs(timeToUse - lastYouTubeTimeRef.current) > 1) {
          // Initialize or reset smoothing
          lastYouTubeTimeRef.current = timeToUse;
          smoothedYouTubeTimeRef.current = timeToUse;
          lastYouTubeUpdateRef.current = now;
        } else {
          // Linear interpolation: estimate time based on last update + elapsed time
          // This smooths out YouTube's ~50ms update intervals
          const estimatedTime = (smoothedYouTubeTimeRef.current || timeToUse) + timeSinceLastUpdate;
          
          // Exponential smoothing: blend YouTube time with estimated time
          // Alpha = 0.3 means 30% new YouTube value, 70% estimated (reduces jitter)
          const alpha = 0.3;
          smoothedYouTubeTimeRef.current = alpha * timeToUse + (1 - alpha) * estimatedTime;
          
          lastYouTubeTimeRef.current = timeToUse;
          lastYouTubeUpdateRef.current = now;
        }
        
        timeToUse = smoothedYouTubeTimeRef.current;
      }

      if (timeToUse === null || (timeToUse === 0 && dt > 0)) {
          const currentStoreTime = useGameStore.getState().currentTime;
          timeToUse = currentStoreTime + dt; 
          
          if (Math.random() < 0.01) {
             // console.log('[GAME-ENGINE] Using fallback local timing:', timeToUse.toFixed(0));
          }
      }

      if (timeToUse !== null) {
        // Apply input calibration offset
        // Positive offset = notes appear earlier (time advances faster)
        // Negative offset = notes appear later (time advances slower)
        const inputOffset = useGameStore.getState().inputOffset || 0;
        const calibratedTime = timeToUse + inputOffset;
        
        setCurrentTime(calibratedTime);
        
        // Get notes for processing
        const currentNotes = useGameStore.getState().notes;
        const playerSpeed = useGameStore.getState().playerSpeed;
        
        // Check for rotation triggers (skip if rotation is disabled)
        const disableRotation = useGameStore.getState().disableRotation;
        if (!disableRotation) {
          checkRotationTriggers({
            notes: currentNotes,
            currentTime: calibratedTime,
            rotationManager,
          });
        }
        
        const result = processor.processNotesFrame(currentNotes, calibratedTime, playerSpeed);
        
        if (result.scoreState) {
             setScore(result.scoreState.score);
             setCombo(result.scoreState.combo);
             setHealth(result.scoreState.health);
             if (result.scoreState.missCount !== undefined) {
                 setMissCount(result.scoreState.missCount);
             }
        }

        if (result.updatedNotes !== currentNotes) {
             // Check for hold notes that just failed/completed and stop deck spinning
             const endDeckHold = useGameStore.getState().endDeckHold;
             result.updatedNotes.forEach((updatedNote, index) => {
               const oldNote = currentNotes[index];
               // If this is a hold note on a horizontal position that just transitioned to failed/completed
               if (updatedNote.type === 'HOLD' && 
                   (updatedNote.lane === -1 || updatedNote.lane === -2) && // DEPRECATED: note.lane field, treat as horizontal positions
                   oldNote && !oldNote.hit && !oldNote.holdMissFailure && !oldNote.holdReleaseFailure &&
                   (updatedNote.hit || updatedNote.holdMissFailure || updatedNote.holdReleaseFailure)) {
                 // Stop deck spinning for this position
                 endDeckHold(updatedNote.lane); // DEPRECATED: note.lane field, treat as position
               }
             });
             
             setNotes(result.updatedNotes);
             GameErrors.updateNoteStats(result.updatedNotes);
        }
      }
      
      // Continue the loop
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    // Start the game loop
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [getVideoTime, gameState, isPaused, setCurrentTime, processor, setScore, setCombo, setHealth, setNotes]);

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
    hitNote: handleHitNote,
    trackHoldStart: handleTrackHoldStart,
    trackHoldEnd: handleTrackHoldEnd,
    markNoteMissed,
    getReleaseTime,
    resetScorer,
    resetRotation,
  };
}
