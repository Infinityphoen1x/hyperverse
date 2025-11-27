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

// Mock song data generator
const generateNotes = (difficulty: Difficulty, duration: number = 60000): Note[] => {
  const notes: Note[] = [];
  const bpm = difficulty === 'EASY' ? 30 : difficulty === 'MEDIUM' ? 60 : 90;
  const interval = 60000 / bpm;
  
  let currentTime = 2000; // Start after 2s
  
  while (currentTime < duration) {
    // Randomize lanes
    const lane = Math.floor(Math.random() * 4);
    
    // Occasional spin notes
    const isSpin = Math.random() > 0.9;
    
    notes.push({
      id: `note-${currentTime}`,
      lane: isSpin ? (Math.random() > 0.5 ? -1 : -2) : lane, // -1 left wheel, -2 right wheel
      time: currentTime,
      type: isSpin ? (Math.random() > 0.5 ? 'SPIN_LEFT' : 'SPIN_RIGHT') : 'TAP',
      hit: false,
      missed: false,
    });
    
    // Difficulty adjustment: more notes for harder levels
    const skipChance = difficulty === 'EASY' ? 0.5 : difficulty === 'MEDIUM' ? 0.2 : 0;
    
    if (Math.random() > skipChance) {
       currentTime += interval;
    } else {
       currentTime += interval * 2;
    }
  }
  
  return notes;
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
    const hitWindow = 300; // ms
    
    setNotes(prev => {
      const noteIndex = prev.findIndex(n => 
        !n.hit && 
        !n.missed && 
        n.lane === lane && 
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
  }, [currentTime]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const trackHoldStart = useCallback((lane: number) => {
    setHoldStartTimes(prev => ({ ...prev, [lane]: currentTime }));
  }, [currentTime]);

  const trackHoldEnd = useCallback((lane: number) => {
    setHoldStartTimes(prev => ({ ...prev, [lane]: 0 }));
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
