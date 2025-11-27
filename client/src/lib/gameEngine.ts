import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Note {
  id: string;
  lane: number; // 0-3 for pads
  time: number; // timestamp in ms when it should be hit
  type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';
  hit: boolean;
  missed: boolean;
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
    const patternDuration = pattern.length * beatDuration;
    
    let currentTime = 2000; // Start after 2s
    let beatIndex = 0;
    let noteCount = 0;
    
    while (currentTime < duration && noteCount < 1000) {
      const patternStep = beatIndex % pattern.length;
      const lane = pattern[patternStep];
      
      // Every 8 beats, place a spin note instead of tap (predictable for testing)
      const isSpin = beatIndex % 8 === 0 && beatIndex > 0;
      
      notes.push({
        id: `note-${Math.round(currentTime)}-${beatIndex}`,
        lane: isSpin ? (beatIndex % 16 === 0 ? -1 : -2) : lane, // Alternate left/right spins
        time: currentTime,
        type: isSpin ? (beatIndex % 16 === 0 ? 'SPIN_LEFT' : 'SPIN_RIGHT') : 'TAP',
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
  const [health, setHealth] = useState(100);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [holdStartTimes, setHoldStartTimes] = useState<Record<number, number>>({ '-1': 0, '-2': 0 }); // Track when Q/P were pressed
  
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setHealth(100);
    setNotes(generateNotes(difficulty));
    setGameState('PLAYING');
    
    // Mock audio loop for rhythm
    // In real implementation, we'd load a file
    startTimeRef.current = Date.now();
    
    const loop = () => {
      const now = Date.now();
      const time = now - startTimeRef.current;
      setCurrentTime(time);
      
      // Check for missed notes - track if game should end
      let shouldGameOver = false;
      setNotes(prev => {
        let newHealth = 100; // Will be updated from state inside this callback
        const newNotes = prev.map(n => {
          if (!n.hit && !n.missed && time > n.time + 200) {
            setCombo(0);
            setHealth(h => {
              newHealth = Math.max(0, h - 5);
              if (newHealth <= 0) shouldGameOver = true;
              return newHealth;
            });
            return { ...n, missed: true };
          }
          return n;
        });
        
        return newNotes;
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
          setHealth(h => Math.min(100, h + 1));
          
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

  const trackHoldStart = useCallback((lane: number, dotProgress: number = 0) => {
    try {
      if (!Number.isInteger(lane) || !Number.isFinite(currentTime)) {
        GameErrors.log(`trackHoldStart: Invalid lane=${lane} or currentTime=${currentTime}`);
        return;
      }
      
      // Find the active hold note on this lane
      const activeNote = notes.find(n => 
        n && 
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.hit && 
        !n.missed
      );
      
      if (!activeNote) {
        GameErrors.log(`trackHoldStart: No active hold note on lane ${lane}`);
        return; // Can't hold - no active note on this lane
      }
      
      // Validate timing: press must be in valid window to start Phase 2
      // Valid window: 500ms before note.time to 2000ms after note.time
      const timeUntilNote = activeNote.time - currentTime;
      const EARLY_WINDOW = 500;      // Can press up to 500ms early
      const LATE_WINDOW = -2000;     // Can press up to 2000ms late
      
      if (timeUntilNote > EARLY_WINDOW) {
        GameErrors.log(`trackHoldStart: EARLY - ${timeUntilNote.toFixed(0)}ms until note`);
        return; // Too early - don't start Phase 2
      }
      
      if (timeUntilNote < LATE_WINDOW) {
        GameErrors.log(`trackHoldStart: LATE - ${timeUntilNote.toFixed(0)}ms until note`);
        return; // Too late - don't start Phase 2
      }
      
      // Valid timing window - Phase 2 starts: dot will spawn and trapezoid shrinks
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
    setGameState
  };
};
