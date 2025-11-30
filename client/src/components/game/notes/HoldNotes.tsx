import React from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { HoldNote } from './HoldNote';
import { useHoldNotes } from '@/hooks/useHoldNotes';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';

interface HoldNotesProps {
  visibleNotes: Note[];
  currentTime: number;
  vpX: number;
  vpY: number;
}

export function HoldNotes({ visibleNotes, currentTime, vpX, vpY }: HoldNotesProps) {
  const processedNotes = useHoldNotes(visibleNotes, currentTime);

  React.useEffect(() => {
    console.log(`[HOLD-NOTES] rendering ${processedNotes.length} hold notes (visible=${visibleNotes.length}, time=${currentTime.toFixed(2)})`);
  }, [processedNotes.length, visibleNotes.length, currentTime]);

  return (
    <svg className="absolute inset-0" style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, opacity: 1, pointerEvents: 'none', margin: '0 auto' }}>
      {processedNotes.map((noteData) => (
        <HoldNote key={noteData.note.id} noteData={noteData} vpX={vpX} vpY={vpY} />
      ))}
    </svg>
  );
}
