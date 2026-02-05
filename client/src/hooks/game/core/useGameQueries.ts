// src/hooks/useGameQueries.ts
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/types/game';

export interface UseGameQueriesReturn {
  activeNotes: Note[];
  completedNotes: Note[];
  activeNotesOnLane: (lane: number) => Note[]; // Legacy name, lane: Position value (-2 to 3)
  isDead: boolean;
}

export function useGameQueries(): UseGameQueriesReturn {
  const activeNotes = useGameStore(state => state.getActiveNotes());
  const completedNotes = useGameStore(state => state.getCompletedNotes());
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
  return useGameStore((state) => state.getActiveNotes());
}
