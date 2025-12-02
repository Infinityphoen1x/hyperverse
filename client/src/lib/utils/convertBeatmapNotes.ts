// src/utils/convertBeatmapNotes.ts (keep original logic, minor refactors for store integration)
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { GAME_ENGINE_TIMING } from '@/lib/config/gameConstants';

export interface BeatmapNote {
  time: number;
  lane: number;
  type: 'TAP' | 'HOLD';
  duration?: number;
  holdId?: string;
  beatmapStart?: number;
  beatmapEnd?: number;
}

export function convertBeatmapNotes(beatmapNotes: BeatmapNote[]): Note[] {
  if (!Array.isArray(beatmapNotes) || beatmapNotes.length === 0) {
    return [];
  }
  const validNoteIndices = new Set<number>();
  const seenHoldIds = new Set<string>();
  for (let i = 0; i < beatmapNotes.length; i++) {
    const note = beatmapNotes[i];
    if (!note || !Number.isFinite(note.time) || !Number.isFinite(note.lane) || !note.type) {
      GameErrors.log(`BeatmapConverter: Invalid note at index ${i}: time=${note?.time}, lane=${note?.lane}, type=${note?.type}`);
      continue;
    }
    if (note.lane !== -2 && note.lane !== -1 && (note.lane < 0 || note.lane > 3)) {
      GameErrors.log(`BeatmapConverter: Invalid lane ${note.lane} at note index ${i}. Valid lanes: -2 (P deck), -1 (Q deck), 0-3 (soundpads)`);
      continue;
    }

    // STRICT ENFORCEMENT: Lanes 0-3 are TAP only. Lanes -1/-2 are HOLD (SPIN) only.
    let enforcedType = note.type;
    
    // Force Soundpads (0-3) to TAP
    if (note.lane >= 0 && note.lane <= 3) {
        if (note.type === 'HOLD') {
            // console.warn(`BeatmapConverter: Lane ${note.lane} forced to TAP (HOLD not supported on soundpads)`);
            enforcedType = 'TAP';
        }
    }

    // Force Decks (-1, -2) to HOLD (SPIN) if they have duration, otherwise TAP (though deck taps might be rare/unsupported?)
    // User said: "Lanes q and p, or -1 and -2, are reserved for hold notes alone"
    if (note.lane === -1 || note.lane === -2) {
        if (note.type === 'TAP') {
             // console.warn(`BeatmapConverter: Lane ${note.lane} forced to HOLD (TAP not supported on decks)`);
             enforcedType = 'HOLD';
             // Give it a default duration if missing, so it works as a spin
             if (!note.duration) note.duration = 1000; 
        }
    }

    if (enforcedType === 'HOLD') {
      if (note.duration === undefined || !Number.isFinite(note.duration) || note.duration <= 0) {
        // If we forced it to HOLD, we might have just added duration. If it was already HOLD but bad duration:
        if (note.lane === -1 || note.lane === -2) {
             note.duration = 1000; // Fallback for decks
        } else {
             GameErrors.log(`BeatmapConverter: HOLD note at index ${i} has invalid duration. Skipping.`);
             continue;
        }
      }
      if (note.holdId && seenHoldIds.has(note.holdId)) {
        continue;
      }
      if (note.holdId) {
        seenHoldIds.add(note.holdId);
      }
    }
    validNoteIndices.add(i);
  }
  const gameNotes: Note[] = [];
  for (let i = 0; i < beatmapNotes.length; i++) {
    if (!validNoteIndices.has(i)) continue;
    const note = beatmapNotes[i];
    
    let type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';
    
    // Re-apply logic to determine final internal type
    // Note: spinAlternation is driven by user KEY PRESSES, not beatmap notes
    // Beatmap only specifies lane (-1/-2 for spins), direction is determined at runtime
    if (note.lane === -1) {
        type = 'SPIN_LEFT';
    } else if (note.lane === -2) {
        type = 'SPIN_RIGHT';
    } else {
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
    
    // Apply duration if it's a spin note
    if ((type === 'SPIN_LEFT' || type === 'SPIN_RIGHT') && note.duration) {
      gameNote.duration = note.duration;
    }
    // Fallback: if we decided it's a spin note but it has no duration (was TAP in beatmap), give it default
    if ((type === 'SPIN_LEFT' || type === 'SPIN_RIGHT') && !gameNote.duration) {
      gameNote.duration = 1000;
    }

    if (note.beatmapStart !== undefined) {
      gameNote.beatmapStart = note.beatmapStart;
    }
    if (note.beatmapEnd !== undefined) {
      gameNote.beatmapEnd = note.beatmapEnd;
    }
    gameNotes.push(gameNote);
  }
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