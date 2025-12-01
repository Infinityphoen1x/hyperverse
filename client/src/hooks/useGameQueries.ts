// src/hooks/useGameQueries.ts
import { useGameStore } from '@/stores/useGameStore';
import { shallow } from 'zustand/shallow';
import type { Note } from '@/types/game';

export function useGameQueries() {
  const activeNotes = useGameStore(state => state.getActiveNotes(), shallow);
  const completedNotes = useGameStore(state => state.getCompletedNotes(), shallow);
  const isDead = useGameStore(state => state.isDead());
  const getActiveNotesOnLane = useGameStore(state => state.getActiveNotesOnLane);

  return {
    activeNotes,
    completedNotes,
    activeNotesOnLane: getActiveNotesOnLane,
    isDead,
  };
}

export function useActiveNotes(): Note[] {
  return useGameStore((state) => state.getActiveNotes(), shallow);
}
