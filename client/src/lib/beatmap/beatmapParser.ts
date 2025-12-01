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
  notes: Note[];
  youtubeVideoId?: string;
  error?: string;
}

export function parseBeatmap(jsonString: string): BeatmapData {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      return { metadata: {}, notes: [], error: 'Invalid beatmap format: expected object' };
    }
    
    const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    
    // Validate notes are Note type
    const validNotes = notes.filter((n: unknown): n is Note => 
      typeof n === 'object' && n !== null && 'time' in n && 'lane' in n
    );
    
    return {
      metadata: typeof parsed.metadata === 'object' ? parsed.metadata : {},
      notes: validNotes,
      youtubeVideoId: typeof parsed.youtubeVideoId === 'string' ? parsed.youtubeVideoId : undefined,
    };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown parsing error';
    console.error("Failed to parse beatmap:", errorMsg);
    return { metadata: {}, notes: [], error: `Parse error: ${errorMsg}` };
  }
}
