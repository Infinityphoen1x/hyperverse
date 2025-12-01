import { create } from 'zustand';
import type { GameState, Note, Difficulty } from '@/types/game';

export interface GameStoreState {
  // Core game state
  gameState: GameState;
  difficulty: Difficulty;
  notes: Note[];
  currentTime: number;
  isPaused: boolean;
  
  // Score tracking
  score: number;
  combo: number;
  health: number;
  maxHealth: number;
  
  // UI state
  countdownSeconds: number;
  
  // Actions
  setGameState: (state: GameState) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setNotes: (notes: Note[]) => void;
  setScore: (score: number) => void;
  setCombo: (combo: number) => void;
  setHealth: (health: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPaused: (paused: boolean) => void;
  setCountdownSeconds: (seconds: number) => void;
  
  // Game actions
  hitNote: (lane: number) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  rewindGame: () => void;
  
  // Computed selectors
  getVisibleNotes: () => Note[];
  getProcessedTapNotes: () => Note[];
  getHoldNotes: () => Note[];
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  // Initial state
  gameState: 'IDLE',
  difficulty: 'MEDIUM',
  notes: [],
  currentTime: 0,
  isPaused: false,
  score: 0,
  combo: 0,
  health: 200,
  maxHealth: 200,
  countdownSeconds: 3,

  // Setters
  setGameState: (gameState) => set({ gameState }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setNotes: (notes) => set({ notes }),
  setScore: (score) => set({ score }),
  setCombo: (combo) => set({ combo }),
  setHealth: (health) => set({ health }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setCountdownSeconds: (countdownSeconds) => set({ countdownSeconds }),

  // Game actions
  hitNote: (lane) => {
    // Placeholder - will integrate with game engine
    console.log(`[GAME] Hit note on lane ${lane}`);
  },
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  rewindGame: () => set({ currentTime: 0 }),

  // Selectors
  getVisibleNotes: () => {
    const { notes, currentTime } = get();
    const leadTime = 2000;
    return notes.filter(n => n.time <= currentTime + leadTime && n.time >= currentTime - 500);
  },
  getProcessedTapNotes: () => {
    const { getVisibleNotes } = get();
    return getVisibleNotes().filter(n => n.type === 'TAP');
  },
  getHoldNotes: () => {
    const { getVisibleNotes } = get();
    return getVisibleNotes().filter(n => n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT');
  },
}));
