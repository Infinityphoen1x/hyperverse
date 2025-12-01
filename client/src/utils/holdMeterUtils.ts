import type { Note } from '@/types/game';

export function getHoldProgress(notes: Note[], currentTime: number, lane: number) {
  const activeHold = notes.find(n => 
    n.lane === lane && 
    (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT' || n.type === 'HOLD') && 
    currentTime >= n.time && 
    currentTime <= (n.time + (n.duration || 0))
  );
  
  if (!activeHold || !activeHold.duration) return 0;
  return Math.min(1, Math.max(0, (currentTime - activeHold.time) / activeHold.duration));
}
