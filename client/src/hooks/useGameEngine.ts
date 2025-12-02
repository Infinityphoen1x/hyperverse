import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note, Difficulty, GameConfig } from '@/types/game';
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { GameErrors } from '@/lib/errors/errorLog';
import { GAME_CONFIG } from '@/lib/config/gameConstants';

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

  const beatmapBpm = useGameStore(state => state.beatmapBpm) || 120;

  // Construct GameConfig from single source of truth
  const gameConfig = useMemo<GameConfig>(() => DEFAULT_CONFIG, []);

  // Initialize Engine Components
  const { processor, validator, scorer } = useMemo(() => {
    const scorer = new ScoringManager(gameConfig);
    const validator = new NoteValidator(gameConfig, beatmapBpm);
    const processor = new NoteProcessor(gameConfig, validator, scorer, beatmapBpm);
    return { processor, validator, scorer };
  }, [gameConfig, beatmapBpm]);

  // Store last frame timestamp for fallback timing
  const lastFrameTimeRef = useRef<number>(performance.now());

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

  // IMPLEMENTATION OF HIT NOTE
  const handleHitNote = useCallback((lane: number) => {
    const { notes, currentTime } = useGameStore.getState();
    
    // Lanes 0-3 are Taps
    if (lane >= 0 && lane <= 3) {
        const targetNote = validator.findClosestActiveNote(notes, lane, 'TAP', currentTime);
        
        if (targetNote) {
            console.log(`[GAME-ENGINE] Try hit note ${targetNote.id} at ${currentTime}ms (diff ${currentTime - targetNote.time}ms)`);
            const result = processor.processTapHit(targetNote, currentTime);
            
            // Always persist the note update (success or failure)
            const updatedNotes = notes.map(n => n.id === targetNote.id ? result.updatedNote : n);
            setNotes(updatedNotes);
            GameErrors.updateNoteStats(updatedNotes);
            
            if (result.success) {
                console.log(`[GAME-ENGINE] Hit success!`, result.scoreChange);
                
                if (result.scoreChange) {
                    setScore(result.scoreChange.score);
                    setCombo(result.scoreChange.combo);
                    setHealth(result.scoreChange.health);
                }
            } else {
                console.log(`[GAME-ENGINE] Hit failed - tapTooEarlyFailure: ${result.updatedNote.tapTooEarlyFailure}, tapMissFailure: ${result.updatedNote.tapMissFailure}`);
                
                if (result.scoreChange) {
                    setScore(result.scoreChange.score);
                    setCombo(result.scoreChange.combo);
                    setHealth(result.scoreChange.health);
                }
            }
        } else {
             console.log(`[GAME-ENGINE] No active note found in lane ${lane} at ${currentTime}`);
        }
    } 
  }, [validator, processor, setNotes, setScore, setCombo, setHealth]);

  const handleTrackHoldStart = useCallback((lane: number) => {
     const { notes, currentTime } = useGameStore.getState();
     
     const targetNote = validator.findPressableHoldNote(notes, lane, currentTime);
     
     if (targetNote) {
         const result = processor.processHoldStart(targetNote, currentTime);
         // Always persist the note update (success or failure)
         const updatedNotes = notes.map(n => n.id === targetNote.id ? result.updatedNote : n);
         setNotes(updatedNotes);
         GameErrors.updateNoteStats(updatedNotes);
         
         if (result.success) {
             startDeckHold(lane);
             
             if (result.scoreChange) {
                 setScore(result.scoreChange.score);
                 setCombo(result.scoreChange.combo);
                 setHealth(result.scoreChange.health);
             }
         } else {
             console.log(`[GAME-ENGINE] Hold start failed - tooEarlyFailure: ${result.updatedNote.tooEarlyFailure}, holdMissFailure: ${result.updatedNote.holdMissFailure}`);
             
             if (result.scoreChange) {
                 setScore(result.scoreChange.score);
                 setCombo(result.scoreChange.combo);
                 setHealth(result.scoreChange.health);
             }
         }
     }
  }, [validator, processor, setNotes, setScore, setCombo, setHealth, startDeckHold]);

  const handleTrackHoldEnd = useCallback((lane: number) => {
     const { notes, currentTime } = useGameStore.getState();
     
     const targetNote = validator.findActiveHoldNote(notes, lane, currentTime);
     
     if (targetNote) {
         const result = processor.processHoldEnd(targetNote, currentTime);
         const updatedNotes = notes.map(n => n.id === targetNote.id ? result.updatedNote : n);
         setNotes(updatedNotes);
         GameErrors.updateNoteStats(updatedNotes);
         
         if (result.scoreChange) {
             setScore(result.scoreChange.score);
             setCombo(result.scoreChange.combo);
             setHealth(result.scoreChange.health);
         }
     }
     endDeckHold(lane);
  }, [validator, processor, setNotes, endDeckHold, setScore, setCombo, setHealth]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || isPaused) {
        lastFrameTimeRef.current = performance.now();
        return;
    }
    
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      let timeToUse: number | null = getVideoTime ? getVideoTime() : null;

      if (timeToUse === null || (timeToUse === 0 && dt > 0)) {
          const currentStoreTime = useGameStore.getState().currentTime;
          timeToUse = currentStoreTime + dt; 
          
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
             GameErrors.updateNoteStats(result.updatedNotes);
        }
      }
    }, 16);
    
    return () => clearInterval(interval);
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
  };
}
