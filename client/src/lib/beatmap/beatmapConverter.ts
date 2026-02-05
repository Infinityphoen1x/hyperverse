import type { Note } from '@/types/game';

export function convertBeatmapNotes(rawNotes: any[], beatmapStart: number = 0): Note[] {
  console.log(`[CONVERTER] Input: ${rawNotes.length} raw notes`);
  console.log(`[CONVERTER] Raw notes:`, rawNotes.map(n => ({ id: n.id, lane: n.lane, time: n.time, type: n.type, duration: n.duration })));
  
  const converted = rawNotes.map((n, i) => {
    const note = {
      id: n.id || `note-${i}`,
      lane: n.lane,
      time: n.time + beatmapStart,
      type: n.type === 'HOLD' ? 'HOLD' : 'TAP',
      duration: n.duration,
      hit: false,
      missed: false,
    };
    // Debug: Log HOLD notes on lanes 0-3
    if (note.type === 'HOLD' && note.lane >= 0 && note.lane <= 3) {
      console.log(`[CONVERTER] Created HOLD note on lane ${note.lane} at ${note.time}ms, duration: ${note.duration}ms, id: ${note.id}`);
    }
    return note;
  });
  
  console.log(`[CONVERTER] Output: ${converted.length} converted notes`);
  console.log(`[CONVERTER] Notes by lane 0:`, converted.filter(n => n.lane === 0).map(n => ({ id: n.id, time: n.time, type: n.type, duration: n.duration })));
  console.log(`[CONVERTER] Total HOLD notes: ${converted.filter(n => n.type === 'HOLD').length}`);
  
  return converted;
}
