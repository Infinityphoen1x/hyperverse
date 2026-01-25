// src/hooks/useVisibleNotes.ts
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/lib/engine/gameTypes';

export function useVisibleNotes(): Note[] {
  const state = useGameStore((s) => s);
  return state.getVisibleNotes?.() ?? [];
}