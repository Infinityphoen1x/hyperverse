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
