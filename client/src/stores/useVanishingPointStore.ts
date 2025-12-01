import { create } from 'zustand';

export interface VanishingPointStoreState {
  vpOffset: { x: number; y: number };
  setVPOffset: (offset: { x: number; y: number }) => void;
}

export const useVanishingPointStore = create<VanishingPointStoreState>((set) => ({
  vpOffset: { x: 0, y: 0 },

  setVPOffset: (vpOffset) => set({ vpOffset }),
}));
