import React from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { TapNote } from './TapNote';
import { useTapNotes } from '@/hooks/useTapNotes';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';

interface TapNotesProps {
  visibleNotes: Note[];
  currentTime: number;
  vpX: number;
  vpY: number;
}

export function TapNotes({ visibleNotes, currentTime, vpX, vpY }: TapNotesProps) {
  const processedNotes = useTapNotes(visibleNotes, currentTime);

  return (
    <svg className="absolute inset-0" style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, opacity: 1, pointerEvents: 'none', margin: '0 auto' }}>
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
