// src/components/TapNotes.tsx
import React from 'react';
import { Note } from '@/lib/engine/gameTypes';
import { TapNote } from './TapNote';
import { useTapNotes } from '@/hooks/useTapNotes';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game state
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';

interface TapNotesProps {
  // Optional overrides; defaults to store for global sync
  visibleNotes?: Note[];
  currentTime?: number;
  vpX?: number;
  vpY?: number;
}

export function TapNotes({ 
  visibleNotes: propVisibleNotes, 
  currentTime: propCurrentTime, 
  vpX: propVpX, 
  vpY: propVpY 
}: TapNotesProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { visibleNotes, currentTime, vpX, vpY } = useGameStore(state => ({
    visibleNotes: propVisibleNotes ?? state.visibleNotes,
    currentTime: propCurrentTime ?? state.currentTime,
    vpX: propVpX ?? state.vpX,
    vpY: propVpY ?? state.vpY,
  }));

  const processedNotes = useTapNotes(visibleNotes, currentTime);

  return (
    <svg 
      className="absolute inset-0" 
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`, 
        opacity: 1, 
        pointerEvents: 'none', 
        margin: '0 auto' 
      }}
    >
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