/**
 * Beatmap text parsing and generation utilities
 */

import { Note } from '@/types/game';

export interface BeatmapMetadata {
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  youtubeUrl: string;
  beatmapStart: number;
  beatmapEnd: number;
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyNotes {
  EASY: Note[];
  MEDIUM: Note[];
  HARD: Note[];
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

/**
 * Generate beatmap text from metadata and notes (single difficulty)
 * @param metadata Beatmap metadata
 * @param notes Array of notes
 * @param difficulty Difficulty level (defaults to MEDIUM)
 * @returns Formatted beatmap text
 */
export function generateBeatmapText(
  metadata: BeatmapMetadata,
  notes: Note[],
  difficulty: Difficulty = 'MEDIUM'
): string {
  const lines: string[] = [];
  
  lines.push(`#TITLE: ${metadata.title}`);
  lines.push(`#ARTIST: ${metadata.artist}`);
  lines.push(`#BPM: ${metadata.bpm}`);
  lines.push(`#DURATION: ${metadata.duration}`);
  lines.push(`#YOUTUBE: ${metadata.youtubeUrl}`);
  lines.push(`#BEATMAPSTART: ${metadata.beatmapStart}`);
  lines.push(`#BEATMAPEND: ${metadata.beatmapEnd}`);
  lines.push('');
  lines.push(`[${difficulty}]`);
  lines.push('');

  // Sort notes by time
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  
  sortedNotes.forEach(note => {
    if (note.type === 'TAP') {
      lines.push(`TAP ${note.lane} ${note.time}`);
    } else if (note.type === 'HOLD') {
      lines.push(`HOLD ${note.lane} ${note.time} ${note.duration || 500}`);
    }
  });

  return lines.join('\n');
}

/**
 * Generate beatmap text with all difficulties
 * @param metadata Beatmap metadata
 * @param difficultyNotes Notes organized by difficulty
 * @returns Formatted beatmap text with all difficulties
 */
export function generateBeatmapTextWithDifficulties(
  metadata: BeatmapMetadata,
  difficultyNotes: DifficultyNotes
): string {
  const lines: string[] = [];
  
  lines.push(`#TITLE: ${metadata.title}`);
  lines.push(`#ARTIST: ${metadata.artist}`);
  lines.push(`#BPM: ${metadata.bpm}`);
  lines.push(`#DURATION: ${metadata.duration}`);
  lines.push(`#YOUTUBE: ${metadata.youtubeUrl}`);
  lines.push(`#BEATMAPSTART: ${metadata.beatmapStart}`);
  lines.push(`#BEATMAPEND: ${metadata.beatmapEnd}`);
  lines.push('');

  // Add each difficulty section
  (['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).forEach((difficulty) => {
    const notes = difficultyNotes[difficulty];
    if (notes.length > 0) {
      lines.push(`[${difficulty}]`);
      lines.push('');
      
      const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
      sortedNotes.forEach(note => {
        if (note.type === 'TAP') {
          lines.push(`TAP ${note.lane} ${note.time}`);
        } else if (note.type === 'HOLD') {
          lines.push(`HOLD ${note.lane} ${note.time} ${note.duration || 500}`);
        }
      });
      lines.push('');
    }
  });

  return lines.join('\n');
}

/**
 * Validate note data
 * @param note Note to validate
 * @returns Array of validation error messages
 */
export function validateNote(note: Note): string[] {
  const errors: string[] = [];

  // Validate lane
  if (![0, 1, 2, 3, -1, -2].includes(note.lane)) {
    errors.push(`Invalid lane: ${note.lane}. Must be 0-3 or -1/-2`);
  }

  // Validate time
  if (note.time < 0) {
    errors.push(`Invalid time: ${note.time}. Must be >= 0`);
  }

  // Validate HOLD duration
  if (note.type === 'HOLD') {
    if (!note.duration || note.duration < 100) {
      errors.push(`Invalid HOLD duration: ${note.duration}. Must be >= 100ms`);
    }
  }

  return errors;
}

/**
 * Check for overlapping notes on the same lane
 * @param notes Array of notes to check
 * @returns Array of overlapping note pairs
 */
export function findOverlappingNotes(notes: Note[]): Array<[Note, Note]> {
  const overlaps: Array<[Note, Note]> = [];
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  for (let i = 0; i < sortedNotes.length - 1; i++) {
    for (let j = i + 1; j < sortedNotes.length; j++) {
      const noteA = sortedNotes[i];
      const noteB = sortedNotes[j];

      // Same lane check
      if (noteA.lane !== noteB.lane) continue;

      // Check if notes overlap in time
      const noteAEnd = noteA.type === 'HOLD' ? noteA.time + (noteA.duration || 0) : noteA.time;
      const noteBStart = noteB.time;

      if (noteAEnd > noteBStart) {
        overlaps.push([noteA, noteB]);
      }

      // If noteB starts after noteA ends, no need to check further
      if (noteBStart > noteAEnd) break;
    }
  }

  return overlaps;
}

/**
 * Validation result interface
 */
export interface ValidationIssue {
  noteId: string;
  type: 'outside_range' | 'invalid_lane' | 'overlapping' | 'invalid_duration';
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validate all notes in a beatmap
 * @param notes Array of notes
 * @param metadata Beatmap metadata
 * @returns Array of validation issues
 */
export function validateBeatmap(notes: Note[], metadata: BeatmapMetadata): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check each note
  notes.forEach(note => {
    // Check if note is outside beatmap range
    if (note.time < metadata.beatmapStart || note.time > metadata.beatmapEnd) {
      issues.push({
        noteId: note.id,
        type: 'outside_range',
        message: `Note at ${note.time}ms is outside beatmap range (${metadata.beatmapStart}-${metadata.beatmapEnd}ms)`,
        severity: 'warning',
      });
    }

    // Check invalid lane
    if (![0, 1, 2, 3, -1, -2].includes(note.lane)) {
      issues.push({
        noteId: note.id,
        type: 'invalid_lane',
        message: `Invalid lane ${note.lane}. Must be 0-3 or -1/-2`,
        severity: 'error',
      });
    }

    // Check HOLD duration
    if (note.type === 'HOLD' && (!note.duration || note.duration < 100)) {
      issues.push({
        noteId: note.id,
        type: 'invalid_duration',
        message: `HOLD note duration ${note.duration}ms is too short (minimum 100ms)`,
        severity: 'error',
      });
    }
  });

  // Check for overlapping notes
  const overlaps = findOverlappingNotes(notes);
  overlaps.forEach(([noteA, noteB]) => {
    issues.push({
      noteId: noteA.id,
      type: 'overlapping',
      message: `Overlaps with note at ${noteB.time}ms on lane ${noteB.lane}`,
      severity: 'warning',
    });
  });

  return issues;
}
