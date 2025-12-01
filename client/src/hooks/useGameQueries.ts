// src/hooks/useGameQueries.ts
import { useGameEngineStore } from '@/stores/useGameEngineStore';
import type { Note } from '@/lib/engine/gameTypes';
import { shallow } from 'zustand/shallow';

export function useGameQueries() {
  const {
    getActiveNotes,
    getCompletedNotes,
    getActiveNotesOnLane,
    isDead,
  } = useGameEngineStore();

  return {
    activeNotes: getActiveNotes(),
    completedNotes: getCompletedNotes(),
    activeNotesOnLane: (lane: number) => getActiveNotesOnLane(lane),
    isDead: isDead(),
  };
}

export function useActiveNotes(): Note[] {
  return useGameEngineStore((state) => state.getActiveNotes(), shallow);
}