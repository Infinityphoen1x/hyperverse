// src/hooks/useTapNotes.ts
import { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';
import { getTapNoteState, TapNoteState, shouldRenderTapNote } from '@/lib/notes/tap/tapNoteHelpers';
import { LEAD_TIME } from '@/lib/config/gameConstants';

export interface TapNoteProcessedData {
  note: Note;
  state: TapNoteState;
  progressForGeometry: number;
  clampedProgress: number;
  rawProgress: number;
}

export function useTapNotes(): TapNoteProcessedData[] {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);

  return useMemo(() => {
    // Filter visibly relevant notes first to reduce map overhead
    const visibleNotes = notes.filter(n => 
        n.time <= currentTime + LEAD_TIME && 
        n.time >= currentTime - 500 // Keep them a bit after they pass
    );
    
    const processed = visibleNotes
      .filter(n => n.type === 'TAP')
      .map(note => {
        const state = getTapNoteState(note, currentTime);
        
        // Calculate progress
        // progress 0 = spawn (far away)
        // progress 1 = hit line (near)
        const rawProgress = 1 - ((note.time - currentTime) / LEAD_TIME);
        const clampedProgress = Math.max(0, Math.min(1, rawProgress));
        
        // For geometry, we allow it to go > 1 to show it falling through/passing judgement line
        const progressForGeometry = rawProgress;

        if (!shouldRenderTapNote(state, note.time - currentTime)) {
            return null;
        }

        return {
          note,
          state,
          progressForGeometry,
          clampedProgress,
          rawProgress
        };
      })
      .filter((n): n is TapNoteProcessedData => n !== null);

      return processed;
  }, [notes, currentTime]);
}