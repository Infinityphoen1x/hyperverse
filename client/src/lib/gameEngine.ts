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

// Mock song data generator
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
    const bpm = difficulty === 'EASY' ? 30 : difficulty === 'MEDIUM' ? 60 : 90;
    const interval = 60000 / bpm;
    
    if (!Number.isFinite(interval) || interval <= 0) {
      GameErrors.log(`Invalid interval calculated: ${interval}`);
      return [];
    }
    
    let currentTime = 2000; // Start after 2s
    let noteCount = 0;
    
    while (currentTime < duration && noteCount < 1000) {
      // Randomize lanes
      const lane = Math.floor(Math.random() * 4);
      
      // Occasional spin notes
      const isSpin = Math.random() > 0.9;
      
      notes.push({
        id: `note-${currentTime}-${noteCount}`,
        lane: isSpin ? (Math.random() > 0.5 ? -1 : -2) : lane,
        time: currentTime,
        type: isSpin ? (Math.random() > 0.5 ? 'SPIN_LEFT' : 'SPIN_RIGHT') : 'TAP',
        hit: false,
        missed: false,
      });
      
      // Difficulty adjustment
      const skipChance = difficulty === 'EASY' ? 0.5 : difficulty === 'MEDIUM' ? 0.2 : 0;
      
      if (Math.random() > skipChance) {
         currentTime += interval;
      } else {
         currentTime += interval * 2;
      }
      noteCount++;
    }
    
    if (noteCount >= 1000) {
      GameErrors.log(`Note generation capped at 1000 notes (possible infinite loop)`);
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
      
      // Check for missed notes
      setNotes(prev => prev.map(n => {
        if (!n.hit && !n.missed && time > n.time + 200) {
          setCombo(0);
          setHealth(h => Math.max(0, h - 5));
          return { ...n, missed: true };
        }
        return n;
      }));

      if (health <= 0) {
        setGameState('GAMEOVER');
        return; // Stop loop
      }

      requestRef.current = requestAnimationFrame(loop);
    };
    
    requestRef.current = requestAnimationFrame(loop);
  }, [difficulty, health]);

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

  const trackHoldStart = useCallback((lane: number) => {
    try {
      if (!Number.isInteger(lane) || !Number.isFinite(currentTime)) {
        GameErrors.log(`trackHoldStart: Invalid lane=${lane} or currentTime=${currentTime}`);
        return;
      }
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
  }, [currentTime]);

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
