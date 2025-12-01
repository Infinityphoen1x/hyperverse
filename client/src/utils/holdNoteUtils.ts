import type { Note } from '@/types/game';

export function processSingleHoldNote(note: Note, currentTime: number) {
  if (!note.duration) return null;
  
  const noteStartTime = note.time;
  const noteEndTime = note.time + note.duration;
  const progress = Math.max(0, Math.min(1, (currentTime - noteStartTime) / note.duration));
  
  return {
    ...note,
    progress,
    isActive: currentTime >= noteStartTime && currentTime <= noteEndTime,
  };
}
