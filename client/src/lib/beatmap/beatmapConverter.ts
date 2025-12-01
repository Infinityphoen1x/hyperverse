import type { Note } from '@/types/game';

export function convertBeatmapNotes(rawNotes: any[]): Note[] {
  return rawNotes.map((n, i) => ({
    id: n.id || `note-${i}`,
    lane: n.lane,
    time: n.time,
    type: n.type === 'HOLD' ? (n.lane === -1 ? 'SPIN_LEFT' : 'SPIN_RIGHT') : 'TAP',
    duration: n.duration,
    hit: false,
    missed: false,
  }));
}
