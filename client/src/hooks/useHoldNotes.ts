// src/hooks/useHoldNotes.ts
import { useMemo } from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { processSingleHoldNote, HoldNoteProcessedData } from '@/utils/holdNoteUtils';

export function useHoldNotes(visibleNotes: Note[], currentTime: number): HoldNoteProcessedData[] {
  return useMemo(() => {
    return visibleNotes
      .filter((n) => n && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && n.id)
      .map((note) => processSingleHoldNote(note, currentTime))
      .filter((data): data is HoldNoteProcessedData => data !== null);
  }, [visibleNotes, currentTime]);
}