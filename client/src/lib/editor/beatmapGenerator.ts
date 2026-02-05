/**
 * Beatmap text generation utilities
 * Converts Note objects into beatmap text format
 */

import { Note } from '@/types/game';
import type { BeatmapMetadata, Difficulty, DifficultyNotes } from './beatmapParser';

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
  
  lines.push('[METADATA]');
  lines.push(`title: ${metadata.title}`);
  lines.push(`artist: ${metadata.artist}`);
  lines.push(`bpm: ${metadata.bpm}`);
  lines.push(`duration: ${metadata.duration}`);
  lines.push(`youtube: ${metadata.youtubeUrl}`);
  lines.push(`beatmapStart: ${metadata.beatmapStart}`);
  lines.push(`beatmapEnd: ${metadata.beatmapEnd}`);
  lines.push('');
  lines.push(`[${difficulty}]`);
  lines.push('');

  // Sort notes by time
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  
  sortedNotes.forEach(note => {
    if (note.type === 'TAP') {
      lines.push(`${note.time}|${note.lane}|TAP`); // DEPRECATED: note.lane field, outputs position value
    } else if (note.type === 'HOLD') {
      lines.push(`${note.time}|${note.lane}|HOLD|${note.duration || 500}`); // DEPRECATED: note.lane field, outputs position value
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
  
  lines.push('[METADATA]');
  lines.push(`title: ${metadata.title}`);
  lines.push(`artist: ${metadata.artist}`);
  lines.push(`bpm: ${metadata.bpm}`);
  lines.push(`duration: ${metadata.duration}`);
  lines.push(`youtube: ${metadata.youtubeUrl}`);
  lines.push(`beatmapStart: ${metadata.beatmapStart}`);
  lines.push(`beatmapEnd: ${metadata.beatmapEnd}`);
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
          lines.push(`${note.time}|${note.lane}|TAP`); // DEPRECATED: note.lane field, outputs position value
        } else if (note.type === 'HOLD') {
          lines.push(`${note.time}|${note.lane}|HOLD|${note.duration || 500}`); // DEPRECATED: note.lane field, outputs position value
        }
      });
      lines.push('');
    }
  });

  return lines.join('\n');
}
