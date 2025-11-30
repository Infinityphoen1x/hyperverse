// src/components/TapNotes.tsx
import React from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { TapNote } from './TapNote';
import { useTapNotes } from '@/hooks/useTapNotes';

interface TapNotesProps {
  visibleNotes: Note[];
  currentTime: number;
  vpX: number;
  vpY: number;
}

export function TapNotes({ visibleNotes, currentTime, vpX, vpY }: TapNotesProps) {
  const processedNotes = useTapNotes(visibleNotes, currentTime);

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1, pointerEvents: 'none' }}>
      {processedNotes.map((noteData) => (
        <TapNote
          key={noteData.note.id}
          note={noteData.note}
          currentTime={currentTime}
          vpX={vpX}
          vpY={vpY}
          state={noteData.state}
          progressForGeometry={noteData.progressForGeometry}
          clampedProgress={noteData.clampedProgress}
          rawProgress={noteData.rawProgress}
        />
      ))}
    </svg>
  );
}