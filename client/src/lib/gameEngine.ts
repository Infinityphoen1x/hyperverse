import { useState, useEffect, useRef, useCallback } from 'react';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Note {
  id: string;
  lane: number; // 0-3 for pads, -1 for left deck (Q), -2 for right deck (P)
  time: number; // timestamp in ms when it should be hit
  type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';
  hit: boolean;
  missed: boolean;
  tapMissFailure?: boolean; // TAP note failed (>200ms past note time)
  tooEarlyFailure?: boolean; // HOLD note pressed outside ±300ms window (too early)
  holdMissFailure?: boolean; // HOLD note expired without activation
  holdReleaseFailure?: boolean; // HOLD note released outside accuracy window
  pressTime?: number; // HOLD note: when player pressed (for release accuracy calculation)
}

// Error tracking for debugging
const GameErrors = {
  notes: [] as string[],
  log: (msg: string) => {
    const timestamp = Date.now();
    const error = `[${timestamp}] ${msg}`;
    GameErrors.notes.push(error);
    if (GameErrors.notes.length > 100) GameErrors.notes.shift(); // Keep last 100
    console.warn(`[GAME ERROR] ${error}`);
  }
};

export { GameErrors };

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

export const useGameEngine = (difficulty: Difficulty) => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER'>('MENU');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [health, setHealth] = useState(200);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [holdStartTimes, setHoldStartTimes] = useState<Record<number, number>>({ [-1]: 0, [-2]: 0 }); // Track when Q/P were pressed
  
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setHealth(200);
    setNotes(generateNotes(difficulty));
    setGameState('PLAYING');
    
    // Mock audio loop for rhythm
    // In real implementation, we'd load a file
    startTimeRef.current = Date.now();
    
    const loop = () => {
      const now = Date.now();
      const time = now - startTimeRef.current;
      setCurrentTime(time);
      
      // Check for missed notes and cleanup old notes
      let shouldGameOver = false;
      setNotes(prev => {
        let newHealth = 200;
        const cleaned: Note[] = [];
        
        for (let i = 0; i < prev.length; i++) {
          const n = prev[i];
          if (!n) continue;
          
          // Cleanup: Remove notes that are far past their visibility window
          // TAP notes: remove if > 3000ms past miss window (2000ms before + 500ms after + 500ms buffer)
          // HOLD notes: remove if > 3000ms past disappearance (4000ms before + 500ms after + 500ms buffer)
          const noteDuration = n.type === 'TAP' ? 2500 : 5000; // visibility + animation time
          if (time > n.time + noteDuration + 500) {
            continue; // Skip (remove) this note
          }
          
          // Check for new failures only (skip already-failed notes)
          if (!n.hit && !n.missed && !n.tapMissFailure && !n.holdReleaseFailure && !n.tooEarlyFailure && !n.holdMissFailure) {
            let shouldMarkFailed = false;
            let failureType: keyof Note | '' = '';
            
            // TAP notes: miss if >200ms past note time
            if (n.type === 'TAP' && time > n.time + 200) {
              shouldMarkFailed = true;
              failureType = 'tapMissFailure';
            }
            // HOLD notes: miss if past activation window (note.time + 300ms) without being pressed
            else if ((n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && time > n.time + 300) {
              shouldMarkFailed = true;
              failureType = 'holdMissFailure';
            }
            
            if (shouldMarkFailed && failureType) {
              setCombo(0);
              setHealth(h => {
                newHealth = Math.max(0, h - 2);
                if (newHealth <= 0) shouldGameOver = true;
                return newHealth;
              });
              cleaned.push({ ...n, [failureType]: true });
              continue;
            }
          }
          
          cleaned.push(n);
        }
        
        return cleaned;
      });
      

      if (shouldGameOver) {
        setGameState('GAMEOVER');
        return; // Stop loop
      }

      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);
  }, [difficulty]);

  const hitNote = useCallback((lane: number) => {
    try {
      if (!Number.isInteger(lane)) {
        GameErrors.log(`hitNote: Invalid lane type: ${typeof lane}`);
        return;
      }
      
      const hitWindow = 300; // ms
      
      setNotes(prev => {
        if (!Array.isArray(prev)) {
          GameErrors.log(`hitNote: notes is not an array`);
          return prev;
        }

        const noteIndex = prev.findIndex(n => 
          n && 
          !n.hit && 
          !n.missed && 
          !n.tapMissFailure &&
          n.lane === lane && 
          Number.isFinite(n.time) &&
          Number.isFinite(currentTime) &&
          Math.abs(n.time - currentTime) < hitWindow
        );

        if (noteIndex !== -1) {
          const note = prev[noteIndex];
          const accuracy = Math.abs(note.time - currentTime);
          let points = 100;
          if (accuracy < 50) points = 300;
          else if (accuracy < 100) points = 200;

          setScore(s => s + points);
          setCombo(c => c + 1);
          setHealth(h => Math.min(200, h + 1));
          
          const newNotes = [...prev];
          newNotes[noteIndex] = { ...note, hit: true };
          return newNotes;
        }
        
        return prev;
      });
    } catch (error) {
      GameErrors.log(`hitNote error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [currentTime]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const trackHoldStart = useCallback((lane: number) => {
    try {
      if (!Number.isInteger(lane) || !Number.isFinite(currentTime)) {
        GameErrors.log(`trackHoldStart: Invalid lane=${lane} or currentTime=${currentTime}`);
        return;
      }
      
      // Find any hold note on this lane that hasn't been played, missed, or marked as failed
      // Once a hold note is marked as any failure type, it can never be activated again
      const anyNote = notes.find(n => {
        if (!n || n.lane !== lane || (n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT') || n.hit || n.missed) {
          return false;
        }
        // Exclude all failure types - once failed, the note is permanently unavailable
        if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
          return false;
        }
        return true;
      });
      
      if (!anyNote) {
        // No active hold note available - this is normal when player presses Q/P at random times
        return;
      }
      
      const timeSinceNoteSpawn = currentTime - anyNote.time;
      
      // Accuracy-based hold activation (same as TAP notes)
      // Press window: ±300ms from note arrival
      const holdActivationWindow = 300; // ms
      
      // Check if press is within accuracy window
      if (Math.abs(timeSinceNoteSpawn) > holdActivationWindow) {
        // Outside window - miss
        if (timeSinceNoteSpawn < -holdActivationWindow) {
          // Too early - mark as tooEarlyFailure
          setNotes(prev => {
            return prev.map(n => 
              n && n.id === anyNote.id ? { ...n, tooEarlyFailure: true } : n
            );
          });
          setCombo(0);
          setHealth(h => Math.max(0, h - 2));
        }
        // Too late - silently ignore (note will eventually miss)
        setHoldStartTimes(prev => ({ ...prev, [lane]: 0 }));
        return;
      }
      
      // Valid press - now player must hold for 500ms and release accurately
      // Store press time for release accuracy calculation
      setNotes(prev => {
        return prev.map(n => 
          n && n.id === anyNote.id ? { ...n, pressTime: currentTime } : n
        );
      });
      
      setHoldStartTimes(prev => {
        if (!prev || typeof prev !== 'object') {
          GameErrors.log(`trackHoldStart: holdStartTimes corrupted`);
          return prev;
        }
        return { ...prev, [lane]: currentTime };
      });
    } catch (error) {
      GameErrors.log(`trackHoldStart error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [currentTime, notes]);

  const trackHoldEnd = useCallback((lane: number) => {
    try {
      if (!Number.isInteger(lane)) {
        GameErrors.log(`trackHoldEnd: Invalid lane=${lane}`);
        return;
      }
      
      const holdStartTime = holdStartTimes[lane];
      
      // Only process if hold was actually active (holdStartTime > 0)
      if (holdStartTime > 0) {
        // Find the active hold note on this lane
        const activeNote = notes.find(n => {
          if (!n || n.lane !== lane || (n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')) {
            return false;
          }
          if (n.hit || n.missed || !n.id) return false;
          // Skip already-failed notes
          if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
            return false;
          }
          return true;
        });
        
        // If there's an active note, check release timing accuracy
        if (activeNote) {
          const HOLD_DURATION = 1000; // ms - must hold for this long (slowed for easier timing)
          const RELEASE_WINDOW = 300; // ms - release accuracy window
          
          // Calculate expected release time
          const pressTime = (activeNote as any).pressTime || holdStartTime;
          const expectedReleaseTime = pressTime + HOLD_DURATION;
          const timeSinceExpectedRelease = currentTime - expectedReleaseTime;
          
          // Check if released too early (before hold duration complete)
          if (currentTime - holdStartTime < HOLD_DURATION) {
            setNotes(prev => {
              return prev.map(n => 
                n && n.id === activeNote.id ? { ...n, holdReleaseFailure: true } : n
              );
            });
            setCombo(0);
            setHealth(h => Math.max(0, h - 2));
          }
          // Check if release is within accuracy window (±300ms from expected release)
          else if (Math.abs(timeSinceExpectedRelease) <= RELEASE_WINDOW) {
            // Successful hold - calculate accuracy tier
            let points = 100; // Good
            if (Math.abs(timeSinceExpectedRelease) < 50) points = 300; // Perfect
            else if (Math.abs(timeSinceExpectedRelease) < 100) points = 200; // Great
            
            setNotes(prev => {
              return prev.map(n => 
                n && n.id === activeNote.id ? { ...n, hit: true } : n
              );
            });
            setScore(s => s + points);
            setCombo(c => c + 1);
            setHealth(h => Math.min(200, h + 1));
          }
          // Released too late (outside release window)
          else {
            setNotes(prev => {
              return prev.map(n => 
                n && n.id === activeNote.id ? { ...n, holdReleaseFailure: true } : n
              );
            });
            setCombo(0);
            setHealth(h => Math.max(0, h - 2));
          }
        }
      }
      
      // Always clear the hold state
      setHoldStartTimes(prev => {
        if (!prev || typeof prev !== 'object') {
          GameErrors.log(`trackHoldEnd: holdStartTimes corrupted`);
          return prev;
        }
        return { ...prev, [lane]: 0 };
      });
    } catch (error) {
      GameErrors.log(`trackHoldEnd error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [currentTime, notes, holdStartTimes]);

  const markNoteMissed = useCallback((noteId: string) => {
    try {
      if (!noteId || typeof noteId !== 'string') {
        GameErrors.log(`markNoteMissed: Invalid noteId=${noteId}`);
        return;
      }
      
      setNotes(prev => {
        if (!Array.isArray(prev)) {
          GameErrors.log(`markNoteMissed: notes is not an array`);
          return prev;
        }

        const noteIndex = prev.findIndex(n => n && n.id === noteId && !n.hit && !n.missed);
        
        if (noteIndex !== -1) {
          const note = prev[noteIndex];
          setCombo(0);
          setHealth(h => {
            const newHealth = Math.max(0, h - 2);
            if (newHealth <= 0) setGameState('GAMEOVER');
            return newHealth;
          });
          
          const newNotes = [...prev];
          newNotes[noteIndex] = { ...note, missed: true };
          return newNotes;
        }
        
        return prev;
      });
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
    holdStartTimes,
    startGame,
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed,
    setGameState
  };
};
