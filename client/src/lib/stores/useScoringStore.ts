// src/stores/useScoringStore.ts
import { create } from 'zustand';
import { produce } from 'zustand/middleware';
import type { ScoreState } from '@/lib/engine/gameTypes';
import { GameConfig } from '@/lib/engine/gameTypes';

interface ScoringState {
  score: number;
  combo: number;
  health: number;
  accuracy: number;
  maxCombo: number;

  init: (config: GameConfig) => void;
  reset: () => void;
  addPoints: (points: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  updateAccuracy: (hitAccuracy: number) => void;
  deductHealth: (amount: number) => void;
  getState: () => ScoreState;
}

export const useScoringStore = create<ScoringState>()(
  produce((set, get) => ({
    score: 0,
    combo: 0,
    health: 100,
    accuracy: 0,
    maxCombo: 0,

    init: (config) => set({ health: config.maxHealth ?? 100 }),

    reset: () => set({ score: 0, combo: 0, health: 100, accuracy: 0, maxCombo: 0 }),

    addPoints: (points) => set((state) => { state.score += points; }),

    incrementCombo: () => {
      const newCombo = get().combo + 1;
      set({ combo: newCombo, maxCombo: Math.max(get().maxCombo, newCombo) });
    },

    resetCombo: () => set({ combo: 0 }),

    updateAccuracy: (hitAccuracy) => {
      const totalHits = get().combo + 1; // Assuming on hit
      const newAccuracy = ((get().accuracy * (totalHits - 1) + hitAccuracy) / totalHits);
      set({ accuracy: newAccuracy });
    },

    deductHealth: (amount) => set((state) => { state.health = Math.max(0, state.health - amount); }),

    getState: () => ({
      score: get().score,
      combo: get().combo,
      health: get().health,
      accuracy: get().accuracy,
      maxCombo: get().maxCombo,
    }),
  }))
);
// src/stores/useScoringStore.ts (snippet: add query)
import type { ScoreState } from '@/lib/engine/gameTypes';

isDead: (): boolean => {
  const { health } = get();
  return health <= 0; // Or config threshold
},