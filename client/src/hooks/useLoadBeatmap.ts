// src/hooks/useLoadBeatmap.ts
import { useGameStore } from '@/stores/useGameStore';

export function useLoadBeatmap(): { notes: any[] } {
  const notes = useGameStore(state => state.notes);
  return { notes };
}