import React, { memo, useCallback } from 'react';
import { HoldNote } from './HoldNote';
import { useHoldNotes } from '@/hooks/useHoldNotes';
import { useGameStore } from '@/stores/useGameStore';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, LEAD_TIME } from '@/lib/config/gameConstants';

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
    const holdNotes = notes.filter(n => n.type === 'HOLD' || n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT');
    const tapNotes = notes.filter(n => n.type === 'TAP');
    
    return notes.filter(n => {
      // For hold notes, check visibility based on note.time + note.duration, not just note.time
      const isHoldNote = n.type === 'HOLD' || n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT';
      const holdDuration = isHoldNote ? (n.duration || 1000) : 0;
      const noteStartTime = n.time;
      const noteEndTime = isHoldNote ? n.time + holdDuration : n.time;
      
      if (n.tooEarlyFailure) return noteStartTime <= currentTime + LEAD_TIME && noteStartTime >= currentTime - 4000;
      if (n.holdMissFailure || n.holdReleaseFailure) return noteStartTime <= currentTime + LEAD_TIME && noteStartTime >= currentTime - 2000;
      
      // For hold notes: keep visible from LEAD_TIME before start to 500ms after end
      // Upper bound: LEAD_TIME before start (so it appears at vanishing point)
      // Lower bound: 500ms after it ends (holdDuration past start)
      if (isHoldNote) {
        const isVisible = noteStartTime <= currentTime + LEAD_TIME && noteEndTime >= currentTime - 500;
        return isVisible;
      }
      
      // For normal tap notes: keep visible from LEAD_TIME before start to 500ms after start
      return noteStartTime <= currentTime + LEAD_TIME && noteStartTime >= currentTime - 500;
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
