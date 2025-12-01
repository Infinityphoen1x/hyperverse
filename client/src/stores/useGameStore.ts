import { create } from 'zustand';
import type { GameStoreState } from '@/types/game';

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
  missCount: 0,
  countdownSeconds: 0,

  // Setters
  setGameState: (gameState) => set({ gameState }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setNotes: (notes) => set({ notes }),
  setScore: (score) => set({ score }),
  setCombo: (combo) => set({ combo }),
  setHealth: (health) => set({ health }),
  setMissCount: (missCount) => set({ missCount }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setCountdownSeconds: (countdownSeconds) => set({ countdownSeconds }),

  // Game actions
  hitNote: (lane) => {
    console.log(`[GAME] Hit note on lane ${lane}`);
  },
  hitPad: (lane) => {
    console.log(`[GAME] Hit pad on lane ${lane}`);
  },
  startDeckHold: (lane) => {
    console.log(`[GAME] Start deck hold on lane ${lane}`);
  },
  endDeckHold: (lane) => {
    console.log(`[GAME] End deck hold on lane ${lane}`);
  },
  pauseGame: () => set({ isPaused: true, countdownSeconds: 0 }),
  resumeGame: () => set({ isPaused: false }),
  rewindGame: () => set({ currentTime: 0 }),
  restartGame: () => set((state) => ({ 
    currentTime: 0, 
    score: 0, 
    combo: 0, 
    health: 200, 
    gameState: 'IDLE', 
    isPaused: false,
    countdownSeconds: 0,
    // Reset note states but keep the notes array
    notes: state.notes.map(note => ({
      ...note,
      hit: false,
      missed: false,
      failureTime: undefined,
      pressHoldTime: undefined,
      releaseTime: undefined,
      tapTooEarlyFailure: false,
      tapMissFailure: false,
      tooEarlyFailure: false,
      holdMissFailure: false,
      holdReleaseFailure: false
    }))
  })),

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
    return getVisibleNotes().filter(n => n.type === 'HOLD' || n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT');
  },
  getActiveNotes: () => {
    return get().getVisibleNotes();
  },
  getCompletedNotes: () => {
    const { notes } = get();
    return notes.filter(n => n.hit || n.missed);
  },
  getActiveNotesOnLane: (lane: number) => {
    return get().getVisibleNotes().filter(n => n.lane === lane);
  },
  isDead: () => {
    return get().health <= 0;
  },
}));
