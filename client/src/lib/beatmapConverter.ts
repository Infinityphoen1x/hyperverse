import { Note } from '@/lib/gameEngine';

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

  const validNotes: BeatmapNote[] = [];

  // First pass: validate and filter
  for (let i = 0; i < beatmapNotes.length; i++) {
    const note = beatmapNotes[i];

    // Validate note structure
    if (!note || !Number.isFinite(note.time) || !Number.isFinite(note.lane) || !note.type) {
      console.warn(`Invalid beatmap note at index ${i}:`, note);
      continue;
    }

    // Reject soundpad HOLD notes (lanes 0-3 can only be TAP)
    if (note.type === 'HOLD' && note.lane >= 0 && note.lane <= 3) {
      console.warn(`Invalid beatmap: soundpad lane ${note.lane} cannot use HOLD type. Use TAP instead.`);
      continue;
    }

    validNotes.push(note);
  }

  // Second pass: convert to game notes, preserving original indices
  const gameNotes: Note[] = [];
  
  for (let i = 0; i < beatmapNotes.length; i++) {
    const note = beatmapNotes[i];
    
    // Skip filtered notes but preserve index for ID generation
    if (!validNotes.includes(note)) {
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
  
  return gameNotes;
}
