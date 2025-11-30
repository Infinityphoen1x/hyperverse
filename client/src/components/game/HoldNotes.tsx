import React from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { HoldNote } from './HoldNote';
import { useHoldNotes } from '@/hooks/useHoldNotes';

interface HoldNotesProps {
  visibleNotes: Note[];
  currentTime: number;
  vpX: number;
  vpY: number;
}

export function HoldNotes({ visibleNotes, currentTime, vpX, vpY }: HoldNotesProps) {
  const processedNotes = useHoldNotes(visibleNotes, currentTime);

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1, pointerEvents: 'none' }}>
      {processedNotes.map((noteData) => (
        <HoldNote key={noteData.note.id} noteData={noteData} vpX={vpX} vpY={vpY} />
      ))}
    </svg>
  );
}
