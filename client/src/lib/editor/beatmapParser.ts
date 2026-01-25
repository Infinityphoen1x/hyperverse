/**
 * Beatmap text parsing utilities
 * Converts beatmap text format into Note objects
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
 * @returns Array of Note objects
 */
export function parseBeatmapText(text: string): Note[] {
  try {
    const lines = text.split('\n');
    const notes: Note[] = [];
    let noteId = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) return;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 3) return;

      const type = parts[0].toUpperCase();
      const lane = parseInt(parts[1]);
      const time = parseInt(parts[2]);

      if (type === 'TAP') {
        notes.push({
          id: `editor-note-${noteId++}`,
          type: 'TAP',
          lane,
          time,
          hit: false,
          missed: false,
        });
      } else if (type === 'HOLD' && parts.length >= 4) {
        const duration = parseInt(parts[3]);
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
    console.error('Failed to parse beatmap:', error);
    return [];
  }
}

/**
 * Parse beatmap text with difficulty sections
 * @param text Beatmap text content
 * @returns Object with notes organized by difficulty
 */
export function parseBeatmapTextWithDifficulties(text: string): DifficultyNotes {
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

    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) return;

    const type = parts[0].toUpperCase();
    const lane = parseInt(parts[1]);
    const time = parseInt(parts[2]);

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
    } else if (type === 'HOLD' && parts.length >= 4) {
      const duration = parseInt(parts[3]);
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
