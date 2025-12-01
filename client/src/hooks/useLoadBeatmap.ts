// src/hooks/useLoadBeatmap.ts
import { useGameStore } from '@/stores/useGameStore';
import type { BeatmapNote } from '@/utils/convertBeatmapNotes';

export function useLoadBeatmap() {
  const loadBeatmapNotes = useGameStore((state) => state.loadBeatmapNotes);
  return { loadBeatmapNotes };
}
// src/hooks/useLoadBeatmap.ts
import { useGameStore } from '@/stores/useGameStore';

export function useLoadBeatmap() {
  const loadBeatmap = useGameStore((state) => state.loadBeatmap);
  const beatmapMetadata = useGameStore((state) => state.beatmapMetadata);
  return { loadBeatmap, beatmapMetadata };
}