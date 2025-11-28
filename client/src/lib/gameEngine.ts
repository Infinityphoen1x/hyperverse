import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TAP_HIT_WINDOW,
  HOLD_MISS_TIMEOUT,
  HOLD_RELEASE_OFFSET,
  HOLD_RELEASE_WINDOW,
  HOLD_ACTIVATION_WINDOW,
  LEAD_TIME,
  ACCURACY_PERFECT_MS,
  ACCURACY_GREAT_MS,
  ACCURACY_PERFECT_POINTS,
  ACCURACY_GREAT_POINTS,
  ACCURACY_NORMAL_POINTS,
  NOTES_SYNC_INTERVAL,
  STATE_UPDATE_BATCH_INTERVAL,
  MAX_HEALTH,
} from '@/lib/gameConstants';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Note {
  id: string;
  lane: number; // 0-3 for pads, -1 for left deck (Q), -2 for right deck (P)
  time: number; // timestamp in ms when it should be hit
  type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';
  duration?: number; // HOLD note: how long player must hold (from beatmap)
  hit: boolean;
  missed: boolean;
  tapMissFailure?: boolean; // TAP note failed (>300ms past note time)
  tooEarlyFailure?: boolean; // HOLD note pressed outside ±300ms window (too early)
  holdMissFailure?: boolean; // HOLD note pressed too LATE - note expired before activation window
  holdReleaseFailure?: boolean; // HOLD note was pressed in time but released too EARLY (failed release accuracy)
  
  // TAP note fields (mutually exclusive with HOLD fields)
  pressTime?: number; // TAP note: when player pressed
  hitTime?: number; // TAP/HOLD: Timestamp when note was successfully completed
  
  // HOLD note fields (mutually exclusive with TAP fields)
  pressHoldTime?: number; // HOLD note: when player started holding
  releaseTime?: number; // HOLD note: when player released
  pressReleaseTime?: number; // HOLD note: when player successfully released (within accuracy window)
  
  failureTime?: number; // Timestamp when failure was marked (for animation timing)
}

// Error tracking for debugging
interface AnimationErrorEntry {
  noteId: string;
  type: 'tapMissFailure' | 'tooEarlyFailure' | 'holdMissFailure' | 'holdReleaseFailure' | 'successful';
  failureTime?: number;
  renderStart?: number;
  renderEnd?: number;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  errorMsg?: string;
}

const GameErrors = {
  notes: [] as string[],
  animations: [] as AnimationErrorEntry[],
  noteStats: {
    total: 0,
    tap: 0,
    hold: 0,
    hit: 0,
    missed: 0,
    failed: 0,
    byLane: {} as Record<number, number>,
  },
  renderStats: {
    rendered: 0,
    preMissed: 0,
  },
  hitStats: {
    successfulHits: 0,
    tapMissFailures: 0,
    tooEarlyFailures: 0,
    holdMissFailures: 0,
    holdReleaseFailures: 0,
  },
  log: (msg: string) => {
    const timestamp = Date.now();
    const error = `[${timestamp}] ${msg}`;
    GameErrors.notes.push(error);
    if (GameErrors.notes.length > 100) GameErrors.notes.shift();
    console.warn(`[GAME ERROR] ${error}`);
  },
  trackAnimation: (noteId: string, type: AnimationErrorEntry['type'], failureTime?: number) => {
    GameErrors.animations.push({
      noteId,
      type,
      failureTime,
      status: 'pending',
    });
    if (GameErrors.animations.length > 200) GameErrors.animations.shift();
  },
  trackRender: (rendered: number, preMissed: number) => {
    GameErrors.renderStats.rendered = rendered;
    GameErrors.renderStats.preMissed = preMissed;
  },
  updateAnimation: (noteId: string, updates: Partial<AnimationErrorEntry>) => {
    const entry = GameErrors.animations.find(a => a.noteId === noteId);
    if (entry) Object.assign(entry, updates);
  },
  updateNoteStats: (allNotes: Note[]) => {
    const stats = {
      total: allNotes.length,
      tap: 0,
      hold: 0,
      hit: 0,
      missed: 0,
      failed: 0,
      byLane: {} as Record<number, number>,
    };
    
    const hitStats = {
      successfulHits: 0,
      tapMissFailures: 0,
      tooEarlyFailures: 0,
      holdMissFailures: 0,
      holdReleaseFailures: 0,
    };
    
    allNotes.forEach(n => {
      if (n.type === 'TAP') stats.tap++;
      else stats.hold++;
      
      if (n.hit) {
        stats.hit++;
        hitStats.successfulHits++;
      }
      if (n.missed) stats.missed++;
      if (n.tapMissFailure || n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
        stats.failed++;
        if (n.tapMissFailure) hitStats.tapMissFailures++;
        if (n.tooEarlyFailure) hitStats.tooEarlyFailures++;
        if (n.holdMissFailure) hitStats.holdMissFailures++;
        if (n.holdReleaseFailure) hitStats.holdReleaseFailures++;
      }
      
      stats.byLane[n.lane] = (stats.byLane[n.lane] || 0) + 1;
    });
    
    GameErrors.noteStats = stats;
    GameErrors.hitStats = hitStats;
  },
  getAnimationStats: () => {
    const total = GameErrors.animations.length;
    const completed = GameErrors.animations.filter(a => a.status === 'completed').length;
    const failed = GameErrors.animations.filter(a => a.status === 'failed').length;
    const pending = GameErrors.animations.filter(a => a.status === 'pending').length;
    const rendering = GameErrors.animations.filter(a => a.status === 'rendering').length;
    return { total, completed, failed, pending, rendering };
  }
};

export { GameErrors };

// Release time tracking for fail state animations (not in schema to maintain mockup simplicity)
export const releaseTimeMap = new Map<string, number>();

export const setReleaseTime = (noteId: string, releaseTime: number) => {
  releaseTimeMap.set(noteId, releaseTime);
};

export const getReleaseTime = (noteId: string): number | undefined => {
  return releaseTimeMap.get(noteId);
};

export const clearReleaseTimes = () => {
  releaseTimeMap.clear();
};

export const useGameEngine = (difficulty: Difficulty, getVideoTime?: () => number | null, customNotes?: Note[]) => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const currentTimeRef = useRef<number>(0);
  const lastStateUpdateRef = useRef<number>(0);
  const lastNotesUpdateRef = useRef<number>(0);
  
  // Refs for game state (updated every frame without re-renders)
  const notesRef = useRef<Note[]>([]);
  const comboRef = useRef<number>(0);
  const healthRef = useRef<number>(MAX_HEALTH);
  const scoreRef = useRef<number>(0);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    comboRef.current = 0;
    healthRef.current = MAX_HEALTH;
    notesRef.current = customNotes || [];
    
    setScore(0);
    setCombo(0);
    setHealth(MAX_HEALTH);
    setNotes(notesRef.current);
    setGameState('PLAYING');
    
    startTimeRef.current = Date.now();
    
    const loop = () => {
      // Check if YouTube video time is available (when a video is loaded)
      let time: number;
      if (getVideoTime) {
        const videoTime = getVideoTime();
        if (videoTime !== null && videoTime >= 0) {
          time = videoTime * 1000;
        } else {
          requestRef.current = requestAnimationFrame(loop);
          return;
        }
      } else {
        const now = Date.now();
        time = now - startTimeRef.current;
      }
      
      currentTimeRef.current = time;
      
      // Check for missed notes - update ref-based state only
      let shouldGameOver = false;
      const notes = notesRef.current;
      if (Array.isArray(notes)) {
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          if (!n) continue;
          
          if (!n.hit && !n.missed && !n.tapMissFailure && !n.holdReleaseFailure && !n.tooEarlyFailure && !n.holdMissFailure) {
            let shouldMarkFailed = false;
            let failureType: keyof Note | '' = '';
            
            if (n.type === 'TAP' && time > n.time + TAP_HIT_WINDOW) {
              shouldMarkFailed = true;
              failureType = 'tapMissFailure';
            } else if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
              // holdMissFailure: Note expired without being pressed AT ALL (user never pressed)
              if (!n.pressHoldTime && time > n.time + HOLD_MISS_TIMEOUT) {
                shouldMarkFailed = true;
                failureType = 'holdMissFailure';
              } 
              // holdReleaseFailure: Fallback timeout if user pressed in time but never released and trackHoldEnd didn't fire
              else if (n.pressHoldTime && n.pressHoldTime > 0 && !n.hit) {
                const noteHoldDuration = n.duration || 1000;
                if (time > n.pressHoldTime + noteHoldDuration + HOLD_RELEASE_OFFSET) {
                  shouldMarkFailed = true;
                  failureType = 'holdReleaseFailure';
                }
              }
            }
            
            if (shouldMarkFailed && failureType) {
              GameErrors.trackAnimation(n.id, failureType as any, time);
              comboRef.current = 0;
              healthRef.current = Math.max(0, healthRef.current - 2);
              if (healthRef.current <= 0) shouldGameOver = true;
              notes[i] = { ...n, [failureType]: true, failureTime: time };
            }
          }
        }
      }
      
      // Sync currentTime every frame for meter calculations
      setCurrentTime(time);
      
      // Sync notes at regular intervals to let framer-motion animate smoothly without thrashing
      // Too frequent updates break motion animations because the array reference changes constantly
      if (time - lastNotesUpdateRef.current >= NOTES_SYNC_INTERVAL) {
        setNotes([...notesRef.current]);
        lastNotesUpdateRef.current = time;
      }
      
      // Sync other state less frequently to reduce re-renders
      if (time - lastStateUpdateRef.current >= STATE_UPDATE_BATCH_INTERVAL) {
        setCombo(comboRef.current);
        setHealth(healthRef.current);
        setScore(scoreRef.current);
        lastStateUpdateRef.current = time;
      }
      
      if (shouldGameOver) {
        setGameState('GAMEOVER');
        setNotes([...notesRef.current]);
        setCombo(comboRef.current);
        setHealth(healthRef.current);
        return;
      }

      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);
  }, [difficulty, getVideoTime, customNotes]);

  const hitNote = useCallback((lane: number) => {
    try {
      if (!Number.isInteger(lane)) {
        GameErrors.log(`hitNote: Invalid lane type: ${typeof lane}`);
        return;
      }
      
      const currentTime = currentTimeRef.current;
      const notes = notesRef.current;
      
      if (!Array.isArray(notes)) {
        GameErrors.log(`hitNote: notes is not an array`);
        return;
      }

      const noteIndex = notes.findIndex(n => 
        n && 
        !n.hit && 
        !n.missed && 
        !n.tapMissFailure &&
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure &&
        n.lane === lane && 
        Number.isFinite(n.time) &&
        Number.isFinite(currentTime) &&
        Math.abs(n.time - currentTime) < TAP_HIT_WINDOW
      );

      if (noteIndex !== -1) {
        const note = notes[noteIndex];
        const accuracy = Math.abs(note.time - currentTime);
        let points = ACCURACY_NORMAL_POINTS;
        if (accuracy < ACCURACY_PERFECT_MS) points = ACCURACY_PERFECT_POINTS;
        else if (accuracy < ACCURACY_GREAT_MS) points = ACCURACY_GREAT_POINTS;

        scoreRef.current += points;
        comboRef.current += 1;
        healthRef.current = Math.min(MAX_HEALTH, healthRef.current + 1);
        
        notes[noteIndex] = { ...note, hit: true, hitTime: currentTime };
        
        // Sync state immediately for visual feedback
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        setHealth(healthRef.current);
        setNotes([...notes]);
      }
    } catch (error) {
      GameErrors.log(`hitNote error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const trackHoldStart = useCallback((lane: number) => {
    try {
      const currentTime = currentTimeRef.current;
      const laneStr = lane === -1 ? 'Q' : 'P';
      GameErrors.log(`trackHoldStart: Lane ${laneStr} (${lane}) at currentTime=${currentTime}`);
      
      if (lane !== -1 && lane !== -2) {
        GameErrors.log(`trackHoldStart: Invalid deck lane=${lane}, must be -1 (Q) or -2 (P)`);
        return;
      }
      if (!Number.isFinite(currentTime)) {
        GameErrors.log(`trackHoldStart: Invalid currentTime=${currentTime}`);
        return;
      }
      
      const notes = notesRef.current;
      
      const anyNote = notes.find(n => {
        if (!n || n.lane !== lane || (n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')) {
          return false;
        }
        
        // CRITICAL: Check time proximity FIRST before any state checks
        // Only match notes within LEAD_TIME window (note spawned and is "visible")
        const timeSinceNoteSpawn = currentTime - n.time;
        if (timeSinceNoteSpawn < -LEAD_TIME) {
          return false; // Note is too far in the future - player pressing randomly
        }
        
        // NOW check state (only after confirming note is in valid time window)
        if (n.hit || n.missed) {
          return false;
        }
        if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
          return false;
        }
        // Check pressHoldTime (already being held)
        if (n.pressHoldTime && n.pressHoldTime > 0) {
          return false;
        }
        return true;
      });
      
      if (!anyNote) {
        GameErrors.log(`trackHoldStart: Lane ${laneStr} - NO HOLD NOTE FOUND at currentTime=${currentTime}`);
        return;
      }
      
      GameErrors.log(`trackHoldStart: Lane ${laneStr} - FOUND HOLD NOTE ${anyNote.id}, time=${anyNote.time}ms, spawn offset=${currentTime - anyNote.time}ms`);
      
      const timeSinceNoteSpawn = currentTime - anyNote.time;
      
      if (Math.abs(timeSinceNoteSpawn) > HOLD_ACTIVATION_WINDOW) {
        // tooEarlyFailure: Pressed BEFORE the activation window
        if (timeSinceNoteSpawn < -HOLD_ACTIVATION_WINDOW) {
          GameErrors.trackAnimation(anyNote.id, 'tooEarlyFailure', currentTime);
          const idx = notes.findIndex(n => n && n.id === anyNote.id);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], pressHoldTime: currentTime, tooEarlyFailure: true, failureTime: currentTime };
            notesRef.current = notes;
          }
          comboRef.current = 0;
          healthRef.current = Math.max(0, healthRef.current - 2);
          setCombo(0);
          setHealth(healthRef.current);
          setNotes([...notes]);
        } 
        // holdMissFailure: Pressed AFTER the activation window (note expired)
        else if (timeSinceNoteSpawn > HOLD_ACTIVATION_WINDOW) {
          GameErrors.trackAnimation(anyNote.id, 'holdMissFailure', currentTime);
          const idx = notes.findIndex(n => n && n.id === anyNote.id);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], pressHoldTime: currentTime, holdMissFailure: true, failureTime: currentTime };
            notesRef.current = notes;
          }
          comboRef.current = 0;
          healthRef.current = Math.max(0, healthRef.current - 2);
          setCombo(0);
          setHealth(healthRef.current);
          setNotes([...notes]);
        }
        return;
      }
      
      const idx = notes.findIndex(n => n && n.id === anyNote.id);
      if (idx !== -1) {
        notes[idx] = { ...notes[idx], pressHoldTime: currentTime };
        notesRef.current = notes;
        GameErrors.log(`trackHoldStart: Lane ${laneStr} - SET pressHoldTime on note ${anyNote.id}`);
        setNotes([...notes]);
      }
    } catch (error) {
      GameErrors.log(`trackHoldStart error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, []);

  const trackHoldEnd = useCallback((lane: number) => {
    try {
      const currentTime = currentTimeRef.current;
      
      if (lane !== -1 && lane !== -2) {
        GameErrors.log(`trackHoldEnd: Invalid deck lane=${lane}, must be -1 (Q) or -2 (P)`);
        return;
      }
      
      const notes = notesRef.current;
      const laneStr = lane === -1 ? 'Q' : 'P';
      
      // DEBUG: Log search attempt
      const potentialNotes = Array.isArray(notes) ? notes.filter(n => n && n.lane === lane && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT')) : [];
      GameErrors.log(`trackHoldEnd: Lane ${laneStr} (${lane}), Found ${potentialNotes.length} HOLD notes on this lane`);
      
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n && 
        n.lane === lane &&
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        n.pressHoldTime && 
        n.pressHoldTime > 0 &&
        !n.hit &&
        !n.missed &&
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure
      ) : null;
      
      if (activeNote && activeNote.pressHoldTime && activeNote.pressHoldTime > 0) {
        GameErrors.log(`trackHoldEnd: Lane ${laneStr} - Found active note ${activeNote.id} at currentTime=${currentTime}, pressHoldTime=${activeNote.pressHoldTime}, duration=${activeNote.duration}`);
        
        const holdDuration = activeNote.duration || 1000;
        const pressHoldTime = activeNote.pressHoldTime;
        const expectedReleaseTime = pressHoldTime + holdDuration;
        const timeSinceExpectedRelease = currentTime - expectedReleaseTime;
        const idx = notes.findIndex(n => n && n.id === activeNote.id);
        
        // Track release time for animations
        setReleaseTime(activeNote.id, currentTime);
        
        if (currentTime - pressHoldTime < holdDuration) {
          GameErrors.log(`trackHoldEnd: Lane ${laneStr} note ${activeNote.id} - HOLD_RELEASE_FAILURE (released too early: ${currentTime - pressHoldTime}ms < ${holdDuration}ms)`);
          GameErrors.trackAnimation(activeNote.id, 'holdReleaseFailure', currentTime);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], releaseTime: currentTime, holdReleaseFailure: true, failureTime: currentTime };
            notesRef.current = notes;
          }
          comboRef.current = 0;
          healthRef.current = Math.max(0, healthRef.current - 2);
          setCombo(0);
          setHealth(healthRef.current);
          setNotes([...notes]);
        } else if (Math.abs(timeSinceExpectedRelease) <= HOLD_RELEASE_WINDOW) {
          GameErrors.log(`trackHoldEnd: Lane ${laneStr} note ${activeNote.id} - SUCCESSFUL HIT (accuracy: ${Math.abs(timeSinceExpectedRelease)}ms, window: ${HOLD_RELEASE_WINDOW}ms)`);
          let points = ACCURACY_NORMAL_POINTS;
          if (Math.abs(timeSinceExpectedRelease) < ACCURACY_PERFECT_MS) points = ACCURACY_PERFECT_POINTS;
          else if (Math.abs(timeSinceExpectedRelease) < ACCURACY_GREAT_MS) points = ACCURACY_GREAT_POINTS;
          
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], hit: true, releaseTime: currentTime, pressReleaseTime: currentTime };
            notesRef.current = notes;
          }
          scoreRef.current += points;
          comboRef.current += 1;
          healthRef.current = Math.min(MAX_HEALTH, healthRef.current + 1);
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setHealth(healthRef.current);
          setNotes([...notes]);
        } else {
          GameErrors.log(`trackHoldEnd: Lane ${laneStr} note ${activeNote.id} - HOLD_RELEASE_FAILURE (released too late: ${timeSinceExpectedRelease}ms > window ${HOLD_RELEASE_WINDOW}ms)`);
          GameErrors.trackAnimation(activeNote.id, 'holdReleaseFailure', currentTime);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], releaseTime: currentTime, holdReleaseFailure: true, failureTime: currentTime };
            notesRef.current = notes;
          }
          comboRef.current = 0;
          healthRef.current = Math.max(0, healthRef.current - 2);
          setCombo(0);
          setHealth(healthRef.current);
          setNotes([...notes]);
        }
      } else {
        GameErrors.log(`trackHoldEnd: Lane ${laneStr} - NO ACTIVE NOTE FOUND (currentTime=${currentTime})`);
      }
    } catch (error) {
      GameErrors.log(`trackHoldEnd error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, []);

  const markNoteMissed = useCallback((noteId: string) => {
    try {
      if (!noteId || typeof noteId !== 'string') {
        GameErrors.log(`markNoteMissed: Invalid noteId=${noteId}`);
        return;
      }
      
      const notes = notesRef.current;
      if (!Array.isArray(notes)) {
        GameErrors.log(`markNoteMissed: notes is not an array`);
        return;
      }

      const noteIndex = notes.findIndex(n => 
        n && 
        n.id === noteId && 
        !n.hit && 
        !n.missed &&
        !n.tapMissFailure &&
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure
      );
      
      if (noteIndex !== -1) {
        comboRef.current = 0;
        healthRef.current = Math.max(0, healthRef.current - 2);
        notes[noteIndex] = { ...notes[noteIndex], missed: true };
        
        setCombo(0);
        setHealth(healthRef.current);
        if (healthRef.current <= 0) setGameState('GAMEOVER');
        setNotes([...notes]);
      }
    } catch (error) {
      GameErrors.log(`markNoteMissed error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, []);

  return {
    gameState,
    score,
    combo,
    health,
    notes,
    currentTime,
    startGame,
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed,
    setGameState
  };
};
