// src/components/TapNotes.tsx
import React, { memo, useCallback } from 'react';
import { TapNote } from './TapNote';
import { useTapNotes } from '@/hooks/game/notes/useTapNotes';
import { useGameStore } from '@/stores/useGameStore';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';

interface TapNotesProps {
  vpX?: number;
  vpY?: number;
}

const TapNotesComponent = ({ vpX: propVpX = 350, vpY: propVpY = 300 }: TapNotesProps) => {
  // Memoize selectors to prevent unnecessary store subscriptions
  const currentTime = useGameStore(state => state.currentTime);
  const tunnelRotation = useGameStore(state => state.tunnelRotation);
  const processedNotes = useTapNotes();
  
  // Use vanishing point as rotation center
  const rotationCenterX = propVpX;
  const rotationCenterY = propVpY;

  return (
    <svg 
      className="absolute inset-0"
      data-testid="tap-notes-container"
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`, 
        opacity: 1, 
        pointerEvents: 'none', 
        margin: '0 auto' 
      }}
    >
      {processedNotes.map((noteData: any) => (
        <TapNote
          key={noteData.note.id}
          note={noteData.note}
          currentTime={currentTime}
          vpX={propVpX}
          vpY={propVpY}
          state={noteData.state}
          progressForGeometry={noteData.progressForGeometry}
          clampedProgress={noteData.clampedProgress}
          rawProgress={noteData.rawProgress}
        />
      ))}
    </svg>
  );
};

export const TapNotes = memo(TapNotesComponent);