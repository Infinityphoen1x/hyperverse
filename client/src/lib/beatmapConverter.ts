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
  return beatmapNotes
    .filter(note => {
      // Reject soundpad HOLD notes (lanes 0-3 can only be TAP)
      if (note.type === 'HOLD' && note.lane >= 0 && note.lane <= 3) {
        console.warn(`Invalid beatmap: soundpad lane ${note.lane} cannot use HOLD type. Use TAP instead.`);
        return false;
      }
      return true;
    })
    .map((note, index) => {
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

    const id = note.holdId || `note-${note.time}-${index}`;
    
    return {
      id,
      lane: note.lane,
      time: note.time,
      type,
      hit: false,
      missed: false,
      // Initialize optional properties for hold notes
      tapMissFailure: undefined,
      tooEarlyFailure: undefined,
      holdMissFailure: undefined,
      holdReleaseFailure: undefined,
      pressTime: undefined,
      failureTime: undefined,
    };
  });
}
