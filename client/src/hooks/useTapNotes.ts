// src/hooks/useTapNotes.ts
import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';

export function useTapNotes(): Note[] {
  const selector = useCallback((state: ReturnType<typeof useGameStore.getState>) => state.getProcessedTapNotes(), []);
  return useGameStore(selector);
}