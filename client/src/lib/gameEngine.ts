import { useState, useEffect, useRef, useCallback } from 'react';

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
  holdMissFailure?: boolean; // HOLD note expired without activation
  holdReleaseFailure?: boolean; // HOLD note released outside accuracy window
  pressTime?: number; // HOLD note: when player pressed (for release accuracy calculation)
  hitTime?: number; // Timestamp when note was successfully hit (for animation timing)
  failureTime?: number; // Timestamp when failure was marked (for animation timing)
}

// Error tracking for debugging
interface AnimationErrorEntry {
  noteId: string;
  type: 'tapMissFailure' | 'tooEarlyFailure' | 'holdMissFailure' | 'holdReleaseFailure';
  failureTime: number;
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
  log: (msg: string) => {
    const timestamp = Date.now();
    const error = `[${timestamp}] ${msg}`;
    GameErrors.notes.push(error);
    if (GameErrors.notes.length > 100) GameErrors.notes.shift();
    console.warn(`[GAME ERROR] ${error}`);
  },
  trackAnimation: (noteId: string, type: AnimationErrorEntry['type'], failureTime: number) => {
    GameErrors.animations.push({
      noteId,
      type,
      failureTime,
      status: 'pending',
    });
    if (GameErrors.animations.length > 200) GameErrors.animations.shift();
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
    
    allNotes.forEach(n => {
      if (n.type === 'TAP') stats.tap++;
      else stats.hold++;
      
      if (n.hit) stats.hit++;
      if (n.missed) stats.missed++;
      if (n.tapMissFailure || n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
        stats.failed++;
      }
      
      stats.byLane[n.lane] = (stats.byLane[n.lane] || 0) + 1;
    });
    
    GameErrors.noteStats = stats;
  },
  getAnimationStats: () => {
    const total = GameErrors.animations.length;
    const completed = GameErrors.animations.filter(a => a.status === 'completed').length;
    const failed = GameErrors.animations.filter(a => a.status === 'failed').length;
    const pending = GameErrors.animations.filter(a => a.status === 'pending').length;
    return { total, completed, failed, pending };
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

// Beat pattern-based note generator (tied to BPM, not random)
const generateNotes = (difficulty: Difficulty, duration: number = 60000): Note[] => {
  try {
    if (!difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      GameErrors.log(`Invalid difficulty: ${difficulty}`);
      return [];
    }
    if (duration <= 0 || !Number.isFinite(duration)) {
      GameErrors.log(`Invalid duration: ${duration}`);
      return [];
    }

    const notes: Note[] = [];
    const bpm = difficulty === 'EASY' ? 60 : difficulty === 'MEDIUM' ? 90 : 120;
    const beatDuration = 60000 / bpm; // ms per beat
    
    if (!Number.isFinite(beatDuration) || beatDuration <= 0) {
      GameErrors.log(`Invalid beatDuration calculated: ${beatDuration}`);
      return [];
    }
    
    // Define repeating beat patterns (4-beat pattern for each difficulty)
    // Pattern: lane number or -1/-2 for spins, repeated
    const patterns = {
      EASY: [0, 1, 2, 3], // Simple: one note per beat in each lane
      MEDIUM: [0, 1, 2, 3, 0, 2, 1, 3], // 8-beat pattern alternating
      HARD: [0, 1, 2, 3, 1, 0, 3, 2, 0, 2, 1, 3, 2, 1, 0, 3], // 16-beat complex
    };
    
    const pattern = patterns[difficulty];
    
    let currentTime = 2000; // Start after 2s
    let beatIndex = 0;
    let noteCount = 0;
    
    while (currentTime < duration && noteCount < 1000) {
      const patternStep = beatIndex % pattern.length;
      const lane = pattern[patternStep];
      
      // Every 4 beats, place a spin note instead of tap (more frequent for playability)
      // This ensures hold notes are available more often for the deck lanes
      const isSpin = beatIndex % 4 === 0 && beatIndex > 0;
      
      notes.push({
        id: `note-${Math.round(currentTime)}-${beatIndex}`,
        lane: isSpin ? (beatIndex % 8 === 0 ? -1 : -2) : lane, // Alternate left/right spins every 4 beats
        time: currentTime,
        type: isSpin ? (beatIndex % 8 === 0 ? 'SPIN_LEFT' : 'SPIN_RIGHT') : 'TAP',
        hit: false,
        missed: false,
      });
      
      currentTime += beatDuration;
      beatIndex++;
      noteCount++;
    }
    
    if (noteCount >= 1000) {
      GameErrors.log(`Note generation capped at 1000 notes`);
    }
    
    return notes;
  } catch (error) {
    GameErrors.log(`generateNotes error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return [];
  }
};

export const useGameEngine = (difficulty: Difficulty, getVideoTime?: () => number | null, customNotes?: Note[]) => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(200);
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
  const healthRef = useRef<number>(200);
  const scoreRef = useRef<number>(0);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    comboRef.current = 0;
    healthRef.current = 200;
    notesRef.current = customNotes || generateNotes(difficulty);
    
    setScore(0);
    setCombo(0);
    setHealth(200);
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
            
            if (n.type === 'TAP' && time > n.time + 300) {
              shouldMarkFailed = true;
              failureType = 'tapMissFailure';
            } else if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
              if (!n.pressTime && time > n.time + 1100) {
                shouldMarkFailed = true;
                failureType = 'holdMissFailure';
              } else if (n.pressTime && n.pressTime > 0 && !n.hit) {
                const noteHoldDuration = n.duration || 1000;
                if (time > n.pressTime + noteHoldDuration + 600) {
                  shouldMarkFailed = true;
                  failureType = 'holdMissFailure';
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
      
      // Sync notes every 16ms (~60fps) to let framer-motion animate smoothly without thrashing
      // Too frequent updates break motion animations because the array reference changes constantly
      if (time - lastNotesUpdateRef.current >= 16) {
        setNotes([...notesRef.current]);
        lastNotesUpdateRef.current = time;
      }
      
      // Sync other state less frequently (every 50ms) to reduce re-renders
      if (time - lastStateUpdateRef.current >= 50) {
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
      
      const hitWindow = 300;
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
        Math.abs(n.time - currentTime) < hitWindow
      );

      if (noteIndex !== -1) {
        const note = notes[noteIndex];
        const accuracy = Math.abs(note.time - currentTime);
        let points = 100;
        if (accuracy < 50) points = 300;
        else if (accuracy < 100) points = 200;

        scoreRef.current += points;
        comboRef.current += 1;
        healthRef.current = Math.min(200, healthRef.current + 1);
        
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
        if (!n || n.lane !== lane || (n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT') || n.hit || n.missed) {
          return false;
        }
        if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
          return false;
        }
        if (n.pressTime && n.pressTime > 0) {
          return false;
        }
        return true;
      });
      
      if (!anyNote) {
        return;
      }
      
      const timeSinceNoteSpawn = currentTime - anyNote.time;
      const holdActivationWindow = 300;
      
      if (Math.abs(timeSinceNoteSpawn) > holdActivationWindow) {
        if (timeSinceNoteSpawn < -holdActivationWindow) {
          GameErrors.trackAnimation(anyNote.id, 'tooEarlyFailure', currentTime);
          const idx = notes.findIndex(n => n && n.id === anyNote.id);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], pressTime: currentTime, tooEarlyFailure: true, failureTime: currentTime };
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
        notes[idx] = { ...notes[idx], pressTime: currentTime };
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
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n && 
        n.lane === lane &&
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        n.pressTime && 
        n.pressTime > 0 &&
        !n.hit &&
        !n.missed &&
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure
      ) : null;
      
      if (activeNote && activeNote.pressTime && activeNote.pressTime > 0) {
        const holdDuration = activeNote.duration || 1000;
        const RELEASE_WINDOW = 100;
        const pressTime = activeNote.pressTime;
        const expectedReleaseTime = pressTime + holdDuration;
        const timeSinceExpectedRelease = currentTime - expectedReleaseTime;
        const idx = notes.findIndex(n => n && n.id === activeNote.id);
        
        // Track release time for animations
        setReleaseTime(activeNote.id, currentTime);
        
        if (currentTime - pressTime < holdDuration) {
          GameErrors.trackAnimation(activeNote.id, 'holdReleaseFailure', currentTime);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], holdReleaseFailure: true, failureTime: currentTime };
          }
          comboRef.current = 0;
          healthRef.current = Math.max(0, healthRef.current - 2);
          setCombo(0);
          setHealth(healthRef.current);
          setNotes([...notes]);
        } else if (Math.abs(timeSinceExpectedRelease) <= RELEASE_WINDOW) {
          let points = 100;
          if (Math.abs(timeSinceExpectedRelease) < 50) points = 300;
          else if (Math.abs(timeSinceExpectedRelease) < 100) points = 200;
          
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], hit: true };
          }
          scoreRef.current += points;
          comboRef.current += 1;
          healthRef.current = Math.min(200, healthRef.current + 1);
          setScore(scoreRef.current);
          setCombo(comboRef.current);
          setHealth(healthRef.current);
          setNotes([...notes]);
        } else {
          GameErrors.trackAnimation(activeNote.id, 'holdReleaseFailure', currentTime);
          if (idx !== -1) {
            notes[idx] = { ...notes[idx], holdReleaseFailure: true, failureTime: currentTime };
          }
          comboRef.current = 0;
          healthRef.current = Math.max(0, healthRef.current - 2);
          setCombo(0);
          setHealth(healthRef.current);
          setNotes([...notes]);
        }
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
