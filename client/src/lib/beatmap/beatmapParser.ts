import type { Note } from '@/types/game';

export interface BeatmapData {
  notes: any[];
  youtubeVideoId?: string;
}

export function parseBeatmap(jsonString: string): BeatmapData {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse beatmap", e);
    return { notes: [] };
  }
}
