// src/utils/convertBeatmapNotes.ts (keep original logic, minor refactors for store integration)
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';

export interface BeatmapNote {
  time: number;
  lane: number; // DEPRECATED: Represents position value (-2 to 3)
  type: 'TAP' | 'HOLD';
  duration?: number;
  holdId?: string;
  beatmapStart?: number;
  beatmapEnd?: number;
}

export function convertBeatmapNotes(beatmapNotes: BeatmapNote[]): Note[] {
  // Note: SPIN_LEFT/SPIN_RIGHT are position indicators only, not rotation directions
  // Position -1 (Q deck, left) → SPIN_LEFT
  // Position -2 (P deck, right) → SPIN_RIGHT
  // Rotation direction alternates at runtime via user key presses, not beatmap
  if (!Array.isArray(beatmapNotes) || beatmapNotes.length === 0) {
    return [];
  }
  const validNoteIndices = new Set<number>();
  const seenHoldIds = new Set<string>();
  for (let i = 0; i < beatmapNotes.length; i++) {
    const note = beatmapNotes[i];
    if (!note || !Number.isFinite(note.time) || !Number.isFinite(note.lane) || !note.type) {
      GameErrors.log(`BeatmapConverter: Invalid note at index ${i}: time=${note?.time}, position=${note?.lane}, type=${note?.type}`); // note.lane is position
      continue;
    }
    if (note.lane !== -2 && note.lane !== -1 && (note.lane < 0 || note.lane > 3)) { // DEPRECATED: note.lane field, treat as position
      GameErrors.log(`BeatmapConverter: Invalid position ${note.lane} at note index ${i}. Valid positions: -2 (P deck), -1 (Q deck), 0-3 (soundpads)`);
      continue;
    }

    // Horizontal positions (-1, -2) enforcement: Force to HOLD if TAP (decks are spin-only)
    let enforcedType = note.type;
    if (note.lane === -1 || note.lane === -2) { // DEPRECATED: note.lane field, treat as horizontal position
        if (note.type === 'TAP') {
             enforcedType = 'HOLD';
             // Give it a default duration if missing, so it works as a spin
             if (!note.duration) note.duration = 1000; 
        }
    }

    if (enforcedType === 'HOLD') {
      if (note.duration === undefined || !Number.isFinite(note.duration) || note.duration <= 0) {
        // If we forced it to HOLD, we might have just added duration. If it was already HOLD but bad duration:
        if (note.lane === -1 || note.lane === -2) { // DEPRECATED: note.lane field, treat as horizontal position
             note.duration = 1000; // Fallback for horizontal positions
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
    
    let type: 'TAP' | 'HOLD';
    
    if (note.type === 'HOLD') {
      type = 'HOLD';
    } else {
      type = 'TAP';
    }

    const id = note.holdId || `note-${note.time}-${i}`;
    const gameNote: Note = {
      id,
      lane: note.lane, // DEPRECATED: note.lane field, represents position value
      time: note.time,
      type,
      hit: false,
      missed: false,
    };
    
    // Apply duration if it's a spin note
    if (type === 'HOLD' && note.duration) {
      gameNote.duration = note.duration;
    }
    // Fallback: if we decided it's a spin note but it has no duration (was TAP in beatmap), give it default
    if (type === 'HOLD' && !gameNote.duration) {
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