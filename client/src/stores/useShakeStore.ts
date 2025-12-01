import { create } from 'zustand';

export interface ShakeStoreState {
  shakeOffset: { x: number; y: number };
  setShakeOffset: (offset: { x: number; y: number }) => void;
}

export const useShakeStore = create<ShakeStoreState>((set) => ({
  shakeOffset: { x: 0, y: 0 },

  setShakeOffset: (shakeOffset) => set({ shakeOffset }),
}));
