/**
 * Beatmap validation utilities
 * Validates note data and checks for errors
 */

import { Note } from '@/types/game';
import type { BeatmapMetadata } from './beatmapParser';
import { MIN_HOLD_DURATION, VALID_LANES, isValidLane } from '@/lib/config/editor';

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
 * Validate note data
 * @param note Note to validate
 * @returns Array of validation error messages
 */
export function validateNote(note: Note): string[] {
  const errors: string[] = [];

  // Validate lane using centralized VALID_LANES constant
  if (!isValidLane(note.lane)) {
    errors.push(`Invalid lane: ${note.lane}. Must be one of: ${VALID_LANES.join(', ')}`);
  }

  // Validate time
  if (note.time < 0) {
    errors.push(`Invalid time: ${note.time}. Must be >= 0`);
  }

  // Validate HOLD duration
  if (note.type === 'HOLD') {
    if (!note.duration || note.duration < MIN_HOLD_DURATION) {
      errors.push(`Invalid HOLD duration: ${note.duration}. Must be >= ${MIN_HOLD_DURATION}ms`);
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

    // Check invalid lane using centralized VALID_LANES constant
    if (!isValidLane(note.lane)) {
      issues.push({
        noteId: note.id,
        type: 'invalid_lane',
        message: `Invalid lane ${note.lane}. Must be one of: ${VALID_LANES.join(', ')}`,
        severity: 'error',
      });
    }

    // Check HOLD duration
    if (note.type === 'HOLD' && (!note.duration || note.duration < MIN_HOLD_DURATION)) {
      issues.push({
        noteId: note.id,
        type: 'invalid_duration',
        message: `HOLD note duration ${note.duration}ms is too short (minimum ${MIN_HOLD_DURATION}ms)`,
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
