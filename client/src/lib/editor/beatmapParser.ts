/**
 * Beatmap text parsing utilities
 * Converts beatmap text format into Note objects
 * 
 * Supported Formats:
 * - New (pipe-delimited): time|lane|TYPE|duration|id
 *   Example: 1000|0|TAP or 2000|1|HOLD|500
 * 
 * - Legacy (space-delimited): TYPE lane time duration
 *   Example: TAP 0 1000 or HOLD 1 2000 500
 * 
 * Auto-detects format based on presence of pipe character.
 * New format is recommended for all new beatmaps.
 */

import { Note } from '@/types/game';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyNotes {
  EASY: Note[];
  MEDIUM: Note[];
  HARD: Note[];
}

export interface BeatmapMetadata {
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  youtubeUrl: string;
  beatmapStart: number;
  beatmapEnd: number;
}

/**
 * Parse beatmap text into notes array
 * @param text Beatmap text content
 * @returns Array of Note objects (empty array if parsing fails)
 */
export function parseBeatmapText(text: string): Note[] {
  try {
    const lines = text.split('\n');
    const notes: Note[] = [];
    let noteId = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) return;

      // Support both formats:
      // New format: time|lane|TYPE|duration|id
      // Old format: TYPE lane time duration
      const parts = trimmed.includes('|') ? trimmed.split('|') : trimmed.split(/\s+/);
      if (parts.length < 3) return;

      let type: string, lane: number, time: number, duration: number | undefined;

      if (trimmed.includes('|')) {
        // New pipe-delimited format: time|lane|TYPE|duration|id
        time = parseInt(parts[0]);
        lane = parseInt(parts[1]);
        type = parts[2].toUpperCase();
        if (parts.length >= 4) {
          duration = parseInt(parts[3]);
        }
      } else {
        // Old space-delimited format: TYPE lane time duration
        type = parts[0].toUpperCase();
        lane = parseInt(parts[1]);
        time = parseInt(parts[2]);
        if (parts.length >= 4) {
          duration = parseInt(parts[3]);
        }
      }

      if (isNaN(lane) || isNaN(time)) return;

      if (type === 'TAP') {
        notes.push({
          id: `editor-note-${noteId++}`,
          type: 'TAP',
          lane,
          time,
          hit: false,
          missed: false,
        });
      } else if (type === 'HOLD' && duration !== undefined && !isNaN(duration)) {
        notes.push({
          id: `editor-note-${noteId++}`,
          type: 'HOLD',
          lane,
          time,
          duration,
          hit: false,
          missed: false,
        });
      }
    });

    return notes;
  } catch (error) {
    console.error('[BEATMAP-PARSER] Failed to parse beatmap text:', error);
    return []; // Return empty array on parse failure
  }
}

/**
 * Parse beatmap text with difficulty sections
 * @param text Beatmap text content
 * @returns Object with notes organized by difficulty
 */
export function parseBeatmapTextWithDifficulties(text: string): DifficultyNotes {
  try {
    const lines = text.split('\n');
    const difficultyNotes: DifficultyNotes = {
      EASY: [],
      MEDIUM: [],
      HARD: [],
    };
    
    let currentDifficulty: Difficulty | null = null;
    let noteId = 0;

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Check for difficulty markers
    if (trimmed.startsWith('[')) {
      const diffMatch = trimmed.match(/\[(EASY|MEDIUM|HARD)\]/);
      if (diffMatch) {
        currentDifficulty = diffMatch[1] as Difficulty;
      }
      return;
    }
    
    if (!trimmed || trimmed.startsWith('#')) return;

    // Support both formats:
    // New format: time|lane|TYPE|duration|id
    // Old format: TYPE lane time duration
    const parts = trimmed.includes('|') ? trimmed.split('|') : trimmed.split(/\s+/);
    if (parts.length < 3) return;

    let type: string, lane: number, time: number, duration: number | undefined;

    if (trimmed.includes('|')) {
      // New pipe-delimited format: time|lane|TYPE|duration|id
      time = parseInt(parts[0]);
      lane = parseInt(parts[1]);
      type = parts[2].toUpperCase();
      if (parts.length >= 4) {
        duration = parseInt(parts[3]);
      }
    } else {
      // Old space-delimited format: TYPE lane time duration
      type = parts[0].toUpperCase();
      lane = parseInt(parts[1]);
      time = parseInt(parts[2]);
      if (parts.length >= 4) {
        duration = parseInt(parts[3]);
      }
    }

    if (isNaN(lane) || isNaN(time)) return;

    // Default to MEDIUM if no difficulty specified
    const targetDifficulty = currentDifficulty || 'MEDIUM';

    if (type === 'TAP') {
      difficultyNotes[targetDifficulty].push({
        id: `editor-note-${noteId++}`,
        type: 'TAP',
        lane,
        time,
        hit: false,
        missed: false,
      });
    } else if (type === 'HOLD' && duration !== undefined && !isNaN(duration)) {
      difficultyNotes[targetDifficulty].push({
        id: `editor-note-${noteId++}`,
        type: 'HOLD',
        lane,
        time,
        duration,
        hit: false,
        missed: false,
      });
    }
  });

  return difficultyNotes;
  } catch (error) {
    console.error('[BEATMAP-PARSER] Failed to parse difficulty-based beatmap:', error);
    return { EASY: [], MEDIUM: [], HARD: [] }; // Return empty difficulties on parse failure
  }
}
/**
 * Extract metadata from beatmap text
 * @param text Beatmap text content
 * @returns Partial metadata object with extracted values
 */
export function parseMetadataFromText(text: string): Partial<BeatmapMetadata> {
  const lines = text.split('\n');
  const metadata: Partial<BeatmapMetadata> = {};

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.slice(1).split(':');
      const value = valueParts.join(':').trim();
      const keyLower = key.toLowerCase();

      if (keyLower === 'title') metadata.title = value;
      else if (keyLower === 'artist') metadata.artist = value;
      else if (keyLower === 'bpm') metadata.bpm = parseFloat(value) || 120;
      else if (keyLower === 'duration') metadata.duration = parseFloat(value) || 0;
      else if (keyLower === 'youtube') metadata.youtubeUrl = value;
      else if (keyLower === 'beatmapstart') metadata.beatmapStart = parseFloat(value) || 0;
      else if (keyLower === 'beatmapend') metadata.beatmapEnd = parseFloat(value) || 0;
    }
  });

  return metadata;
}
