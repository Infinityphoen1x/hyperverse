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
  notes: any[]; // Raw notes to be converted
  youtubeVideoId?: string;
  error?: string;
}

export function parseBeatmap(text: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): BeatmapData {
  try {
    // Check if it's JSON first (backward compatibility)
    if (text.trim().startsWith('{')) {
      const parsed = JSON.parse(text);
      return {
        metadata: parsed.metadata || {},
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        youtubeVideoId: parsed.metadata?.youtube,
      };
    }

    // Parse custom text format
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const metadata: BeatmapMetadata = {};
    const notes: any[] = [];
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1);
        continue;
      }

      if (currentSection === 'METADATA') {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          const k = key.trim().toLowerCase();
          if (k === 'title') metadata.title = value;
          if (k === 'artist') metadata.artist = value;
          if (k === 'bpm') metadata.bpm = parseFloat(value);
          if (k === 'duration') metadata.duration = parseInt(value);
          if (k === 'youtube') metadata.youtube = value;
          if (k === 'beatmapstart') metadata.beatmapStart = parseInt(value);
          if (k === 'beatmapend') metadata.beatmapEnd = parseInt(value);
        }
      } else if (currentSection === difficulty) {
        // Parse note line: time|lane|type|duration|id
        const parts = line.split('|');
        if (parts.length >= 3) {
          const time = parseInt(parts[0]);
          const lane = parseInt(parts[1]);
          const type = parts[2].toUpperCase();
          
          if (!isNaN(time) && !isNaN(lane)) {
            const note: any = { time, lane, type };
            
            if (type === 'HOLD' && parts.length >= 4) {
              note.duration = parseInt(parts[3]);
            }
            
            // Optional ID
            if (parts.length >= 5) {
              note.id = parts[4];
            }

            notes.push(note);
          }
        }
      }
    }

    return {
      metadata,
      notes,
      youtubeVideoId: metadata.youtube,
    };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown parsing error';
    console.error("Failed to parse beatmap:", errorMsg);
    return { metadata: {}, notes: [], error: `Parse error: ${errorMsg}` };
  }
}
