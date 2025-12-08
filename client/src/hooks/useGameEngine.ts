import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note, Difficulty, GameConfig } from '@/types/game';
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { ScoringManager } from '@/lib/managers/scoringManager';
import { RotationManager } from '@/lib/managers/rotationManager';
import { GameErrors } from '@/lib/errors/errorLog';
import { GAME_CONFIG } from '@/lib/config';
import { requiresRotation, getTargetRotation } from '@/lib/config/rotationConstants';

// Default config from single source of truth
const DEFAULT_CONFIG: GameConfig = GAME_CONFIG as GameConfig;

// Helper: Find which original lane is currently aligned with the target deck lane due to rotation
function findRotatedLaneForDeck(deckLane: number, tunnelRotation: number): number | null {
  if (deckLane !== -1 && deckLane !== -2) return null; // Only applies to deck lanes
  
  // Lane angles (before rotation): -2: 60°, -1: 120°, 0: 180°, 1: 240°, 2: 300°, 3: 0°
  const targetAngle = deckLane === -1 ? 120 : 60; // Where the deck lane is positioned
  
  // Check which lane is rotated to match this angle
  // Normalize rotation to 0-360
  const normalizedRotation = ((tunnelRotation % 360) + 360) % 360;
  
  // Lane 0 (W) is at 180°, rotating by -60° puts it at 120° (lane -1 position)
  // Lane 1 (O) is at 240°, rotating by -120° puts it at 120° (lane -1 position)
  // etc.
  
  const laneBaseAngles = { 0: 180, 1: 240, 2: 300, 3: 0 };
  
  for (const [lane, baseAngle] of Object.entries(laneBaseAngles)) {
    const rotatedAngle = (baseAngle + normalizedRotation) % 360;
    // Check if this lane is now aligned with the target deck position (within 5° tolerance)
    if (Math.abs(rotatedAngle - targetAngle) < 5 || Math.abs(rotatedAngle - targetAngle) > 355) {
      return parseInt(lane);
    }
  }
  
  return null;
}


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

  const { processor, validator, scorer, rotationManager } = useMemo(() => {
    const scorer = new ScoringManager(gameConfig);
    const validator = new NoteValidator(gameConfig);
    const processor = new NoteProcessor(gameConfig, validator, scorer);
    const rotationManager = new RotationManager();
    return { processor, validator, scorer, rotationManager };
  }, [gameConfig]);

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
     const { notes, currentTime, tunnelRotation } = useGameStore.getState();
     
     // Try finding note on the pressed lane
     let targetNote = validator.findPressableHoldNote(notes, lane, currentTime);
     
     // If pressing a deck lane and no note found, check if a rotated lane is aligned with this deck
     if (!targetNote && (lane === -1 || lane === -2)) {
       const rotatedLane = findRotatedLaneForDeck(lane, tunnelRotation);
       if (rotatedLane !== null) {
         targetNote = validator.findPressableHoldNote(notes, rotatedLane, currentTime);
         console.log(`[GAME-ENGINE] Checking rotated lane ${rotatedLane} for deck ${lane}, found:`, !!targetNote);
       }
     }
     
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
     const { notes, currentTime, tunnelRotation } = useGameStore.getState();
     
     // Try finding note on the pressed lane
     let targetNote = validator.findActiveHoldNote(notes, lane, currentTime);
     
     // If releasing a deck lane and no note found, check if a rotated lane is aligned with this deck
     if (!targetNote && (lane === -1 || lane === -2)) {
       const rotatedLane = findRotatedLaneForDeck(lane, tunnelRotation);
       if (rotatedLane !== null) {
         targetNote = validator.findActiveHoldNote(notes, rotatedLane, currentTime);
         console.log(`[GAME-ENGINE] Checking rotated lane ${rotatedLane} for deck ${lane} release, found:`, !!targetNote);
       }
     }
     
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
         
         // Handle rotation reset on HOLD release
         if (requiresRotation(targetNote.lane)) {
             const setTunnelRotation = useGameStore.getState().setTunnelRotation;
             const shouldRotate = rotationManager.onHoldRelease(targetNote.id, currentTime);
             if (shouldRotate) {
                 const rotState = rotationManager.getState();
                 setTunnelRotation(rotState.targetAngle);
             }
         }
     }
     endDeckHold(lane);
  }, [validator, processor, rotationManager, setNotes, endDeckHold, setScore, setCombo, setHealth]);

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
        
        // Check for rotation triggers
        const currentNotes = useGameStore.getState().notes;
        const upcomingHolds = currentNotes.filter(n =>
          n.type === 'HOLD' &&
          requiresRotation(n.lane) &&
          !n.hit &&
          !n.holdMissFailure &&
          n.time > timeToUse
        );
        
        if (upcomingHolds.length > 0) {
          // Sort by time, get the closest one
          upcomingHolds.sort((a, b) => a.time - b.time);
          const nextHold = upcomingHolds[0];
          
          // Calculate when rotation should start
          const LEAD_TIME = 2000; // Import this from constants
          const ROTATION_TRIGGER_ADVANCE = 1700; // ROTATION_DURATION + SETTLE_TIME
          const rotationStartTime = nextHold.time - LEAD_TIME - ROTATION_TRIGGER_ADVANCE;
          
          // Trigger rotation if we've reached start time
          if (timeToUse >= rotationStartTime) {
            const currentTunnelRotation = useGameStore.getState().tunnelRotation;
            const targetAngle = getTargetRotation(nextHold.lane, currentTunnelRotation);
            const rotState = rotationManager.getState();
            
            // Only trigger if we need a new rotation
            if (rotationManager.shouldOverride(targetAngle)) {
              const setTunnelRotation = useGameStore.getState().setTunnelRotation;
              setTunnelRotation(targetAngle);
              rotationManager.triggerRotation(nextHold.id, targetAngle, timeToUse);
            }
          }
        }
        
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
