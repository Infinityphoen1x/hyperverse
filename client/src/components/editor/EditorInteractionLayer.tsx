/**
 * EditorInteractionLayer - Invisible clickable overlay for note selection
 * 
 * This layer sits on top of the rendered notes and provides interaction.
 * It renders invisible polygons matching the exact geometry of each note,
 * allowing direct clicking/dragging of notes while keeping the game
 * rendering layer pure and non-interactive.
 */

import React, { memo, useCallback } from 'react';
import { Note } from '@/types/game';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, LEAD_TIME } from '@/lib/config';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { useGameStore } from '@/stores/useGameStore';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';
import { getPositionAngle } from '@/lib/utils/laneUtils';
import { calculateTapNoteGeometry } from '@/lib/geometry/tapNoteGeometry';
import { getTrapezoidCorners } from '@/lib/geometry/holdNoteGeometry';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';
import { calculateApproachGeometry } from '@/lib/geometry/holdNoteGeometry';

interface EditorInteractionLayerProps {
  vpX: number;
  vpY: number;
  selectedNoteId: string | null;
  onNoteClick: (note: Note, event: React.MouseEvent) => void;
  onNoteMouseDown: (note: Note, event: React.MouseEvent) => void;
}

const EditorInteractionLayerComponent = ({ 
  vpX, 
  vpY,
  selectedNoteId, 
  onNoteClick,
  onNoteMouseDown
}: EditorInteractionLayerProps) => {
  const notes = useGameStore(state => state.notes || []);
  const currentTime = useGameStore(state => state.currentTime);
  const playerSpeed = useGameStore(state => state.playerSpeed) || 20;
  const tunnelRotation = useTunnelRotation();

  // Filter visible notes (same logic as game rendering)
  const visibleNotes = React.useMemo(() => {
    if (!notes || !Array.isArray(notes)) return [];
    
    const MAGIC_MS = 80000;
    const effectiveLeadTime = MAGIC_MS / playerSpeed;
    const hitCleanupWindow = effectiveLeadTime / 8;
    
    return notes.filter(n => {
      if (n.type === 'HOLD' && n.hit && n.releaseTime) return false;
      
      const isHoldNote = n.type === 'HOLD';
      const holdDuration = isHoldNote ? (n.duration || 1000) : 0;
      const noteStartTime = n.time;
      const noteEndTime = isHoldNote ? n.time + holdDuration : n.time;
      
      if (isHoldNote) {
        return noteStartTime <= currentTime + effectiveLeadTime && 
               noteEndTime >= currentTime - hitCleanupWindow;
      }
      
      return noteStartTime <= currentTime + effectiveLeadTime && 
             noteStartTime >= currentTime - hitCleanupWindow;
    });
  }, [notes, currentTime, playerSpeed]);

  const handleNoteClick = useCallback((note: Note) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onNoteClick(note, e);
  }, [onNoteClick]);

  const handleNoteMouseDown = useCallback((note: Note) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onNoteMouseDown(note, e);
  }, [onNoteMouseDown]);

  return (
    <svg 
      className="absolute inset-0" 
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`, 
        opacity: 0, // Invisible but still interactive
        pointerEvents: 'auto',
        margin: '0 auto',
        zIndex: 10
      }}
    >
      {visibleNotes.map(note => {
        let geometry;
        
        if (note.type === 'HOLD' && note.duration) {
          // HOLD note geometry
          const progress = 1 - ((note.time - currentTime) / LEAD_TIME);
          const endProgress = 1 - ((note.time + note.duration - currentTime) / LEAD_TIME);
          
          if (progress < 0 || endProgress > 1.5) return null;
          
          const timeUntilHit = note.time - currentTime;
          const holdGeometry = calculateApproachGeometry(
            timeUntilHit,
            0, // pressHoldTime
            false, // isTooEarlyFailure
            note.duration,
            false, // isHoldMissFailure
            false, // useFixedDepth
            LEAD_TIME // effectiveLeadTime
          );
          const rayAngle = getPositionAngle(note.lane, tunnelRotation); // DEPRECATED: note.lane field, treat as position
          const corners = getTrapezoidCorners(
            rayAngle, 
            holdGeometry.nearDistance, 
            holdGeometry.farDistance, 
            vpX, 
            vpY, 
            note.id
          );
          
          if (!corners) return null;
          
          const { x1, y1, x2, y2, x3, y3, x4, y4 } = corners;
          geometry = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
          
        } else {
          // TAP note geometry
          const progress = 1 - ((note.time - currentTime) / LEAD_TIME);
          
          if (progress < 0 || progress > 1.2) return null;
          
          const rayAngle = getPositionAngle(note.lane, tunnelRotation); // DEPRECATED: note.lane field, treat as position
          const tapGeometry = calculateTapNoteGeometry(
            progress, 
            rayAngle, 
            vpX, 
            vpY, 
            false, // isHit
            currentTime,
            false, // isFailed
            note.time,
            undefined, // failureTime
            false // isTapMissFailure
          );
          
          geometry = tapGeometry.points;
        }

        const isSelected = note.id === selectedNoteId;

        return (
          <polygon
            key={`interaction-${note.id}`}
            data-note-id={note.id}
            data-note-type={note.type}
            points={geometry}
            fill="transparent"
            stroke="transparent"
            strokeWidth={0}
            style={{ 
              cursor: isSelected ? 'move' : 'pointer',
              pointerEvents: 'auto'
            }}
            onClick={handleNoteClick(note)}
            onMouseDown={handleNoteMouseDown(note)}
          />
        );
      })}
    </svg>
  );
};

export const EditorInteractionLayer = memo(EditorInteractionLayerComponent);
