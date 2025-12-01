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
      if (n.tooEarlyFailure) return n.time <= currentTime + leadTime && n.time >= currentTime - 4000;
      if (n.holdMissFailure || n.holdReleaseFailure) return n.time <= currentTime + leadTime && n.time >= currentTime - 2000;
      return n.time <= currentTime + leadTime && n.time >= currentTime - 500;
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
