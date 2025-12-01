// src/hooks/useVisibleNotes.ts
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';
import { shallow } from 'zustand/shallow';

export function useVisibleNotes(): Note[] {
  return useGameStore((state) => state.getVisibleNotes(), shallow);
}