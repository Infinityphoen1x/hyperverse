import type { Note } from '@/types/game';

export interface BeatmapMetadata {
  title?: string;
  artist?: string;
  bpm?: number;
  duration?: number;
  youtube?: string;
  beatmapStart?: number;
  beatmapEnd?: number;
}

export interface BeatmapData {
  metadata: BeatmapMetadata;
  notes: any[];
  youtubeVideoId?: string;
}

export function parseBeatmap(jsonString: string, difficulty?: string): BeatmapData {
  try {
    const parsed = JSON.parse(jsonString);
    return {
      metadata: parsed.metadata || {},
      notes: parsed.notes || [],
      youtubeVideoId: parsed.youtubeVideoId,
    };
  } catch (e) {
    console.error("Failed to parse beatmap", e);
    return { metadata: {}, notes: [] };
  }
}
