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
 * HOLD with lanes 0-3 becomes SPIN_LEFT (pads don't support holds in current design)
 */
export function convertBeatmapNotes(beatmapNotes: BeatmapNote[]): Note[] {
  return beatmapNotes.map((note, index) => {
    let type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT' = note.type as any;
    
    // Convert HOLD to SPIN based on lane
    if (note.type === 'HOLD') {
      if (note.lane === -2) {
        type = 'SPIN_RIGHT';
      } else {
        // Default to SPIN_LEFT for lane -1 and soundpad lanes (shouldn't happen)
        type = 'SPIN_LEFT';
      }
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
