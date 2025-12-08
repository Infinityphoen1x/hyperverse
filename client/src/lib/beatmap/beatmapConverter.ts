import type { Note } from '@/types/game';

export function convertBeatmapNotes(rawNotes: any[], beatmapStart: number = 0): Note[] {
  return rawNotes.map((n, i) => ({
    id: n.id || `note-${i}`,
    lane: n.lane,
    time: n.time + beatmapStart,
    type: n.type === 'HOLD' ? 'HOLD' : 'TAP',
    duration: n.duration,
    hit: false,
    missed: false,
  }));
}
