// src/hooks/useTapNotes.ts
import { useGameStore } from '@/stores/useGameStore';
import type { ProcessedTapNote } from '@/lib/engine/gameTypes'; // Or local if not exported
import { shallow } from 'zustand/shallow';

export function useTapNotes(): ProcessedTapNote[] {
  return useGameStore((state) => state.getProcessedTapNotes(), shallow); // Memo on array changes
}