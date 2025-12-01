// src/utils/convertBeatmapNotes.ts (keep original logic, minor refactors for store integration)
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';

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
    if (note.type === 'HOLD' && note.lane >= 0 && note.lane <= 3) {
      GameErrors.log(`BeatmapConverter: Soundpad lane ${note.lane} cannot use HOLD type (note index ${i}). Use TAP instead.`);
      continue;
    }
    if (note.type === 'HOLD') {
      if (note.duration === undefined || !Number.isFinite(note.duration) || note.duration <= 0) {
        GameErrors.log(`BeatmapConverter: HOLD note at index ${i} has invalid duration: ${note.duration}. Duration must be > 0.`);
        continue;
      }
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
  const gameNotes: Note[] = [];
  for (let i = 0; i < beatmapNotes.length; i++) {
    if (!validNoteIndices.has(i)) continue;
    const note = beatmapNotes[i];
    let type: 'TAP' | 'SPIN_LEFT' | 'SPIN_RIGHT';
    if (note.type === 'TAP') {
      type = 'TAP';
    } else if (note.type === 'HOLD') {
      type = note.lane === -2 ? 'SPIN_RIGHT' : 'SPIN_LEFT';
      GameErrors.log(`BeatmapConverter: HOLD note ${note.holdId} lane=${note.lane} → type=${type}`);
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
    if (note.type === 'HOLD' && note.duration) {
      gameNote.duration = note.duration;
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