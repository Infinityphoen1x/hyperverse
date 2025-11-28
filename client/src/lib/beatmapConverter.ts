import { Note, GameErrors } from '@/lib/gameEngine';

export interface BeatmapNote {
  time: number;
  lane: number;
  type: 'TAP' | 'HOLD';
  duration?: number;
  holdId?: string;
}

/**
 * Convert beatmap notes to gameEngine notes
 * TAP stays TAP
 * HOLD with lane -1 becomes SPIN_LEFT, lane -2 becomes SPIN_RIGHT
 * HOLD with lanes 0-3 are INVALID (pads don't support holds)
 */
export function convertBeatmapNotes(beatmapNotes: BeatmapNote[]): Note[] {
  // Input validation
  if (!Array.isArray(beatmapNotes) || beatmapNotes.length === 0) {
    return [];
  }

  const validNoteIndices = new Set<number>();
  const seenHoldIds = new Set<string>();

  // First pass: validate and filter - collect indices of valid notes
  for (let i = 0; i < beatmapNotes.length; i++) {
    const note = beatmapNotes[i];

    // Validate note structure
    if (!note || !Number.isFinite(note.time) || !Number.isFinite(note.lane) || !note.type) {
      GameErrors.log(`BeatmapConverter: Invalid note at index ${i}: time=${note?.time}, lane=${note?.lane}, type=${note?.type}`);
      continue;
    }

    // Validate lane is in valid range
    if (note.lane !== -2 && note.lane !== -1 && (note.lane < 0 || note.lane > 3)) {
      GameErrors.log(`BeatmapConverter: Invalid lane ${note.lane} at note index ${i}. Valid lanes: -2 (P deck), -1 (Q deck), 0-3 (soundpads)`);
      continue;
    }

    // Reject soundpad HOLD notes (lanes 0-3 can only be TAP)
    if (note.type === 'HOLD' && note.lane >= 0 && note.lane <= 3) {
      GameErrors.log(`BeatmapConverter: Soundpad lane ${note.lane} cannot use HOLD type (note index ${i}). Use TAP instead.`);
      continue;
    }

    // Validate HOLD notes have valid duration
    if (note.type === 'HOLD') {
      if (note.duration === undefined || !Number.isFinite(note.duration) || note.duration <= 0) {
        GameErrors.log(`BeatmapConverter: HOLD note at index ${i} has invalid duration: ${note.duration}. Duration must be > 0.`);
        continue;
      }
      
      // Deduplicate: skip if we've already processed this holdId
      if (note.holdId && seenHoldIds.has(note.holdId)) {
        GameErrors.log(`BeatmapConverter: Duplicate holdId "${note.holdId}" at note index ${i}. Skipping duplicate.`);
        continue;
      }
      if (note.holdId) {
        seenHoldIds.add(note.holdId);
      }
    }

    validNoteIndices.add(i);
  }

  // Second pass: convert to game notes, preserving original indices
  const gameNotes: Note[] = [];
  
  for (let i = 0; i < beatmapNotes.length; i++) {
    const note = beatmapNotes[i];
    
    // Skip filtered notes but preserve index for ID generation - O(1) lookup with Set
    if (!validNoteIndices.has(i)) {
      continue;
    }

    let type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';

    if (note.type === 'TAP') {
      type = 'TAP';
    } else if (note.type === 'HOLD') {
      // HOLD can only be on deck lanes (-1, -2)
      type = note.lane === -2 ? 'SPIN_RIGHT' : 'SPIN_LEFT';
    } else {
      // Should never reach here due to parsing, but type-safe default
      type = 'TAP';
    }

    const id = note.holdId || `note-${note.time}-${i}`;

    const gameNote: Note = {
      id,
      lane: note.lane,
      time: note.time,
      type,
      hit: false,
      missed: false,
    };
    
    // Add duration only for HOLD notes from beatmap
    if (note.type === 'HOLD' && note.duration) {
      gameNote.duration = note.duration;
    }
    
    gameNotes.push(gameNote);
  }
  
  // Validate chronological order and sort if needed
  let isChronological = true;
  for (let i = 1; i < gameNotes.length; i++) {
    if (gameNotes[i].time < gameNotes[i - 1].time) {
      isChronological = false;
      break;
    }
  }
  
  if (!isChronological) {
    GameErrors.log(`BeatmapConverter: Notes were out of chronological order, sorting by time`);
    gameNotes.sort((a, b) => a.time - b.time);
  }
  
  return gameNotes;
}
