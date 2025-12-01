// src/hooks/useTapNotes.ts
import { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';

export function useTapNotes(): Note[] {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);

  return useMemo(() => {
    const leadTime = 2000;
    const visibleNotes = notes.filter(n => n.time <= currentTime + leadTime && n.time >= currentTime - 500);
    return visibleNotes.filter(n => n.type === 'TAP');
  }, [notes, currentTime]);
}