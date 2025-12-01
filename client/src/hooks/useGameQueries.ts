// src/hooks/useGameQueries.ts
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/types/game'; // Updated import path
import { shallow } from 'zustand/shallow';

export function useGameQueries() {
  const {
    getActiveNotes,
    getCompletedNotes,
    getActiveNotesOnLane,
    isDead,
  } = useGameStore();

  return {
    activeNotes: getActiveNotes(),
    completedNotes: getCompletedNotes(),
    activeNotesOnLane: (lane: number) => getActiveNotesOnLane(lane),
    isDead: isDead(),
    // Add any other missing properties if needed by consumers
    // For example, some consumers might expect raw arrays if they were accessing store state directly
  };
}

export function useActiveNotes(): Note[] {
  return useGameStore((state) => state.getActiveNotes(), shallow);
}
