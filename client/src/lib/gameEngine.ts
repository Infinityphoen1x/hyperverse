import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TAP_HIT_WINDOW,
  TAP_FAILURE_BUFFER,
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
  tapTooEarlyFailure?: boolean; // TAP note pressed BEFORE hit window (too early)
  tapMissFailure?: boolean; // TAP note pressed AFTER hit window (too late / missed)
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
  
  // Beatmap timing windows (optional)
  beatmapStart?: number; // ms - notes don't appear/process before this time
  beatmapEnd?: number; // ms - notes don't appear/process after this time
}

// Error tracking for debugging
interface AnimationErrorEntry {
  noteId: string;
  type: 'tapTooEarlyFailure' | 'tapMissFailure' | 'tooEarlyFailure' | 'holdMissFailure' | 'holdReleaseFailure' | 'successful';
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
    tapTooEarlyFailures: 0,
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
      tapTooEarlyFailures: 0,
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
      if (n.tapTooEarlyFailure || n.tapMissFailure || n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
        stats.failed++;
        if (n.tapTooEarlyFailure) hitStats.tapTooEarlyFailures++;
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

export type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'RESUMING' | 'REWINDING' | 'GAME_OVER';

export const useGameEngine = (difficulty: Difficulty, getVideoTime?: () => number | null, customNotes?: Note[]) => {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  
  const requestRef = useRef<number | undefined>(undefined);
  const gameStateRef = useRef<GameState>('IDLE');
  
  // ============================================================================
  // 7 CRITICAL TIMING VARIABLES - MUST REMAIN SEPARATE
  // ============================================================================
  const musicTimeRef = useRef<number>(0);           // authoritative audio time (from YouTube)
  const gameTimeRef = useRef<number>(0);            // local visual time (interpolated)
  const pauseTimeRef = useRef<number>(0);           // music time at which pause occurred
  const startOffsetRef = useRef<number>(0);         // for countdown (time when game started)
  const scoreRef = useRef<number>(0);               // game score
  const comboRef = useRef<number>(0);               // game combo
  const isFirstStartRef = useRef<boolean>(true);    // flag for first start
  
  // Supporting refs
  const lastStateUpdateRef = useRef<number>(0);
  const lastNotesUpdateRef = useRef<number>(0);
  const lastCountdownUpdateRef = useRef<number>(0);
  
  // Refs for game state (updated every frame without re-renders)
  const notesRef = useRef<Note[]>([]);
  const healthRef = useRef<number>(MAX_HEALTH);

  // Sync gameStateRef with gameState whenever it changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    comboRef.current = 0;
    healthRef.current = MAX_HEALTH;
    notesRef.current = customNotes || [];
    lastCountdownUpdateRef.current = 0;
    
    setScore(0);
    setCombo(0);
    setHealth(MAX_HEALTH);
    setNotes(notesRef.current);
    GameErrors.log(`[ENGINE-STARTUP-INIT] Starting game directly in PLAYING state`);
    setGameState('PLAYING');
    setCountdownSeconds(0);
    
    // Calibrate startOffsetRef using performance.now() for precise timing
    // During COUNTDOWN: score=0, combo=0, YouTube paused at 0:00
    // When countdown completes: YouTube plays, state=PLAYING
    startOffsetRef.current = performance.now();
    pauseTimeRef.current = 0;
    musicTimeRef.current = 0;
    gameTimeRef.current = 0;
    isFirstStartRef.current = true;
    
    const loop = () => {
      // Skip update if paused
      if (isPaused) {
        requestRef.current = requestAnimationFrame(loop);
        return;
      }
      
      // Calculate game time: elapsed time since startOffsetRef
      let time: number;
      if (getVideoTime) {
        const videoTime = getVideoTime();
        // videoTime is authoritative audio time from YouTube (milliseconds)
        if (videoTime !== null && videoTime >= 0) {
          time = videoTime;
          musicTimeRef.current = time; // Update authoritative audio time
        } else {
          // YouTube player not ready yet - use game timer as fallback
          const now = performance.now();
          time = now - startOffsetRef.current - pauseTimeRef.current;
        }
      } else {
        const now = performance.now();
        time = now - startOffsetRef.current - pauseTimeRef.current;
      }
      
      // Round time to integer milliseconds to ensure consistent calculations
      time = Math.round(time);
      gameTimeRef.current = time;
      
      // Check for missed notes and cleanup completed animations - update ref-based state only (skip during COUNTDOWN)
      let shouldGameOver = false;
      const notes = notesRef.current;
      if (gameStateRef.current === 'PLAYING' && Array.isArray(notes)) {
        for (let i = 0; i < notes.length; i++) {
          const n = notes[i];
          if (!n) continue;
          
          // Cleanup successfully hit notes after animation completes (700ms after hit)
          if (n.hit && n.hitTime && time > n.hitTime + 700) {
            notes.splice(i, 1);
            i--; // Adjust index after removing element
            continue;
          }
          
          if (!n.hit && !n.missed && !n.tapTooEarlyFailure && !n.tapMissFailure && !n.holdReleaseFailure && !n.tooEarlyFailure && !n.holdMissFailure) {
            let shouldMarkFailed = false;
            let failureType: keyof Note | '' = '';
            
            if (n.type === 'TAP' && time > n.time + TAP_HIT_WINDOW + TAP_FAILURE_BUFFER) {
              shouldMarkFailed = true;
              failureType = 'tapMissFailure';
              // Log detailed failure reason for debugging
              const timeSinceMissWindow = time - (n.time + TAP_HIT_WINDOW);
              GameErrors.log(`TAP note ${n.id} on lane ${n.lane} auto-failed: ${timeSinceMissWindow}ms past miss window (no user input detected)`);
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
              notes[i] = { ...n, [failureType]: true, failureTime: Math.round(time) };
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
        setGameState('GAME_OVER');
        setNotes([...notesRef.current]);
        setCombo(comboRef.current);
        setHealth(healthRef.current);
        return;
      }

      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);
  }, [difficulty, getVideoTime, customNotes, isPaused]);
  
  const pauseGame = useCallback(() => {
    pauseTimeRef.current = gameTimeRef.current; // Save current game time at pause
    setIsPaused(true);
  }, []);
  
  const resumeGame = useCallback(() => {
    // Recalibrate startOffsetRef so game time continues from pauseTimeRef
    const now = performance.now();
    startOffsetRef.current = now - pauseTimeRef.current;
    setIsPaused(false);
  }, []);
  
  const restartGame = useCallback(() => {
    scoreRef.current = 0;
    comboRef.current = 0;
    healthRef.current = MAX_HEALTH;
    pauseTimeRef.current = 0;
    gameTimeRef.current = 0;
    musicTimeRef.current = 0;
    
    // Reset notes to fresh state (no failure markers) - critical for rewind to render correctly
    notesRef.current = customNotes || [];
    
    setScore(0);
    setCombo(0);
    setHealth(MAX_HEALTH);
    setNotes([...notesRef.current]);
    setIsPaused(false);
    
    startOffsetRef.current = performance.now();
    isFirstStartRef.current = true;
  }, [customNotes]);

  const hitNote = useCallback((lane: number) => {
    try {
      if (!Number.isInteger(lane)) {
        GameErrors.log(`hitNote: Invalid lane type: ${typeof lane}`);
        return;
      }
      
      const currentTime = gameTimeRef.current;
      const notes = notesRef.current;
      
      if (!Array.isArray(notes)) {
        GameErrors.log(`hitNote: notes is not an array`);
        return;
      }

      // CRITICAL: Find closest TAP note on this lane (regardless of timing) to classify failure
      const potentialNotes = notes.filter(n => 
        n && 
        !n.hit && 
        !n.missed && 
        !n.tapTooEarlyFailure &&
        !n.tapMissFailure &&
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure &&
        n.lane === lane && 
        n.type === 'TAP' &&
        Number.isFinite(n.time)
      );

      if (potentialNotes.length === 0) {
        GameErrors.log(`hitNote: Lane ${lane} - NO TAP NOTES ON THIS LANE (user input ignored)`);
        return;
      }

      // Find closest note to current time
      const closestNote = potentialNotes.reduce((prev, curr) => 
        Math.abs(curr.time - currentTime) < Math.abs(prev.time - currentTime) ? curr : prev
      );
      
      const timeSinceNote = currentTime - closestNote.time;
      const noteIndex = notes.findIndex(n => n && n.id === closestNote.id);

      // tapTooEarlyFailure: Pressed BEFORE hit window (too early)
      if (timeSinceNote < -TAP_HIT_WINDOW) {
        GameErrors.trackAnimation(closestNote.id, 'tapTooEarlyFailure', currentTime);
        notes[noteIndex] = { 
          ...notes[noteIndex], 
          pressTime: Math.round(currentTime), 
          tapTooEarlyFailure: true, 
          failureTime: Math.round(currentTime) 
        };
        comboRef.current = 0;
        healthRef.current = Math.max(0, healthRef.current - 2);
        GameErrors.log(`hitNote: Lane ${lane} - TAP_TOO_EARLY (${Math.abs(timeSinceNote)}ms early)`);
        setCombo(0);
        setHealth(healthRef.current);
        setNotes([...notes]);
        return;
      }

      // Valid hit: within ±TAP_HIT_WINDOW
      if (Math.abs(timeSinceNote) < TAP_HIT_WINDOW) {
        const accuracy = Math.abs(timeSinceNote);
        let points = ACCURACY_NORMAL_POINTS;
        if (accuracy < ACCURACY_PERFECT_MS) points = ACCURACY_PERFECT_POINTS;
        else if (accuracy < ACCURACY_GREAT_MS) points = ACCURACY_GREAT_POINTS;

        scoreRef.current += points;
        comboRef.current += 1;
        healthRef.current = Math.min(MAX_HEALTH, healthRef.current + 1);
        
        notes[noteIndex] = { ...closestNote, hit: true, hitTime: Math.round(currentTime) };
        
        GameErrors.log(`hitNote: Lane ${lane} - HIT (accuracy ${accuracy}ms, +${points} points)`);
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        setHealth(healthRef.current);
        setNotes([...notes]);
        return;
      }

      // tapMissFailure: Pressed AFTER hit window (too late)
      GameErrors.log(`hitNote: Lane ${lane} - NO MATCH (tried at ${currentTime}ms, note at ${closestNote.time}ms, ${timeSinceNote}ms late)`);
      // Don't mark as failure here - let auto-fail logic in game loop handle it
      return;
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
      const currentTime = gameTimeRef.current;
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
            notes[idx] = { ...notes[idx], pressHoldTime: Math.round(currentTime), tooEarlyFailure: true, failureTime: Math.round(currentTime) };
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
            notes[idx] = { ...notes[idx], pressHoldTime: Math.round(currentTime), holdMissFailure: true, failureTime: Math.round(currentTime) };
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
        notes[idx] = { ...notes[idx], pressHoldTime: Math.round(currentTime) };
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
      const currentTime = gameTimeRef.current;
      
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
        // CRITICAL: Release window is from note.time to note.time + duration
        // NOT from pressHoldTime (when player actually pressed)
        // This matches meter calculation which uses note.time as reference
        const expectedReleaseTime = activeNote.time + holdDuration;
        const timeSinceExpectedRelease = currentTime - expectedReleaseTime;
        const idx = notes.findIndex(n => n && n.id === activeNote.id);
        
        // Track release time for animations - round to ensure integer milliseconds
        setReleaseTime(activeNote.id, Math.round(currentTime));
        
        if (currentTime - activeNote.time < holdDuration) {
          const elapsedFromNoteTime = currentTime - activeNote.time;
          GameErrors.log(`trackHoldEnd: Lane ${laneStr} note ${activeNote.id} - HOLD_RELEASE_FAILURE (released too early: ${elapsedFromNoteTime}ms < ${holdDuration}ms)`);
          GameErrors.trackAnimation(activeNote.id, 'holdReleaseFailure', currentTime);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], releaseTime: Math.round(currentTime), holdReleaseFailure: true, failureTime: Math.round(currentTime) };
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
            notes[idx] = { ...notes[idx], hit: true, releaseTime: Math.round(currentTime), pressReleaseTime: Math.round(currentTime) };
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
            notes[idx] = { ...notes[idx], releaseTime: Math.round(currentTime), holdReleaseFailure: true, failureTime: Math.round(currentTime) };
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
        if (healthRef.current <= 0) setGameState('GAME_OVER');
        setNotes([...notes]);
      }
    } catch (error) {
      GameErrors.log(`markNoteMissed error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, []);

  // Keep gameStateRef in sync with gameState so the game loop always has current state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  return {
    gameState,
    score,
    combo,
    health,
    notes,
    currentTime,
    isPaused,
    countdownSeconds,
    startGame,
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed,
    setGameState,
    pauseGame,
    resumeGame,
    restartGame
  };
};
