// Beatmap validation for HOLD note pairing constraints
import { Note } from '@/lib/engine/gameTypes';
import { areOpposite } from '@/lib/config/rotationConstants';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  noteIds: string[];
  timestamp: number;
}

/**
 * Validate HOLD note pairings in a beatmap
 * HOLD notes that overlap in time must be on opposite lanes (180° apart)
 */
export function validateHoldNotePairings(notes: Note[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Get all HOLD notes
  const holdNotes = notes.filter(n => 
    n.type === 'HOLD'
  );
  
  // Check each HOLD note against others
  for (let i = 0; i < holdNotes.length; i++) {
    const note1 = holdNotes[i];
    const note1End = note1.time + (note1.duration || 0);
    
    for (let j = i + 1; j < holdNotes.length; j++) {
      const note2 = holdNotes[j];
      const note2End = note2.time + (note2.duration || 0);
      
      // Check if notes overlap in time
      const overlaps = (
        (note1.time <= note2.time && note1End > note2.time) ||
        (note2.time <= note1.time && note2End > note1.time)
      );
      
      if (overlaps) {
        // Overlapping HOLD notes must be on opposite lanes
        if (!areOpposite(note1.lane, note2.lane)) {
          errors.push({
            type: 'error',
            message: `Overlapping HOLD notes on non-opposite lanes (${note1.lane} and ${note2.lane}). Valid pairs: W+I, O+E, Q+P`,
            noteIds: [note1.id, note2.id],
            timestamp: note1.time,
          });
        }
      }
    }
  }
  
  return errors;
}

/**
 * Validate entire beatmap
 */
export function validateBeatmap(notes: Note[]): {
  valid: boolean;
  errors: ValidationError[];
} {
  const errors = validateHoldNotePairings(notes);
  
  return {
    valid: errors.filter(e => e.type === 'error').length === 0,
    errors,
  };
}
