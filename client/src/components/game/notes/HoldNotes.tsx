import React, { memo, useCallback } from 'react';
import { HoldNote } from './HoldNote';
import { useHoldNotes } from '@/hooks/useHoldNotes';
import { useGameStore } from '@/stores/useGameStore';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';

interface HoldNotesProps {
  vpX?: number;
  vpY?: number;
}

const HoldNotesComponent = ({ vpX: propVpX = 350, vpY: propVpY = 300 }: HoldNotesProps) => {
  // Split selectors to prevent unnecessary object creation and re-renders
  const notes = useGameStore(state => state.notes || []);
  const currentTime = useGameStore(state => state.currentTime);

  const visibleNotes = React.useMemo(() => {
    if (!notes || !Array.isArray(notes)) return [];
    const leadTime = 2000;
    return notes.filter(n => {
      // For hold notes, check visibility based on note.time + note.duration, not just note.time
      const isHoldNote = n.type === 'HOLD' || n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT';
      const holdDuration = isHoldNote ? (n.duration || 1000) : 0;
      const noteStartTime = n.time;
      const noteEndTime = isHoldNote ? n.time + holdDuration : n.time;
      
      if (n.tooEarlyFailure) return noteStartTime <= currentTime + leadTime && noteStartTime >= currentTime - 4000;
      if (n.holdMissFailure || n.holdReleaseFailure) return noteStartTime <= currentTime + leadTime && noteStartTime >= currentTime - 2000;
      
      // For hold notes: keep visible from far past (vanishing point) through entire duration
      // Lower bound: leadTime + holdDuration before note start (so it's visible traveling through tunnel)
      // Upper bound: 500ms after note ends
      if (isHoldNote) {
        return noteStartTime <= currentTime + leadTime && noteEndTime >= currentTime - (leadTime + holdDuration);
      }
      
      // For normal tap notes: keep visible from leadTime before start to 500ms after start
      return noteStartTime <= currentTime + leadTime && noteStartTime >= currentTime - 500;
    });
  }, [notes, currentTime]);

  const processedNotes = useHoldNotes(visibleNotes, currentTime);

  return (
    <svg 
      className="absolute inset-0" 
      data-testid="hold-notes-container"
      style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, opacity: 1, pointerEvents: 'none', margin: '0 auto' }}
    >
      {processedNotes.map((noteData: any) => (
        <HoldNote key={noteData.note.id} noteData={noteData} vpX={propVpX} vpY={propVpY} />
      ))}
    </svg>
  );
};

export const HoldNotes = memo(HoldNotesComponent);
