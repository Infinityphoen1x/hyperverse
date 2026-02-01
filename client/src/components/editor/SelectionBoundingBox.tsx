/**
 * SelectionBoundingBox - Shows a box around selected notes
 * 
 * Reuses exact note geometry to draw a bounding rectangle
 * around the selected note's trapezoid.
 */

import React, { memo, useMemo } from 'react';
import { Note } from '@/types/game';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, LEAD_TIME } from '@/lib/config';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { GAME_CONFIG } from '@/lib/config/timing';
import { useGameStore } from '@/stores/useGameStore';
import { getLaneAngle } from '@/lib/utils/laneUtils';
import { calculateTapNoteGeometry } from '@/lib/geometry/tapNoteGeometry';
import { getTrapezoidCorners } from '@/lib/geometry/holdNoteGeometry';
import { calculateApproachGeometry } from '@/lib/geometry/holdNoteGeometry';
import { calculateDistances } from '@/lib/geometry/tapNoteGeometry';
import { calculateRayCorners } from '@/lib/geometry/tapNoteGeometry';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';
import type { HandleType } from '@/hooks/editor/useHandleDetection';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

interface SelectionBoundingBoxProps {
  selectedNote: Note | null;
  currentTime: number;
  vpX: number;
  vpY: number;
  onHandleMouseDown: (noteId: string, handle: HandleType, event: React.MouseEvent) => void;
}

const SelectionBoundingBoxComponent = ({
  selectedNote,
  currentTime,
  vpX,
  vpY,
  onHandleMouseDown
}: SelectionBoundingBoxProps) => {
  // Early return BEFORE hooks to avoid hook count mismatch
  if (!selectedNote) return null;
  
  const tunnelRotation = useTunnelRotation();

  let points: string = '';
  
  if (selectedNote.type === 'HOLD' && selectedNote.duration) {
    // HOLD note geometry
    const progress = 1 - ((selectedNote.time - currentTime) / LEAD_TIME);
    const endProgress = 1 - ((selectedNote.time + selectedNote.duration - currentTime) / LEAD_TIME);
    
    if (progress < 0 || endProgress > 1.5) return null;
    
    const timeUntilHit = selectedNote.time - currentTime;
    const holdGeometry = calculateApproachGeometry(
      timeUntilHit,
      0, // pressHoldTime
      false, // isTooEarlyFailure
      selectedNote.duration,
      false, // isHoldMissFailure
      false, // useFixedDepth
      LEAD_TIME // effectiveLeadTime
    );
    
    const rayAngle = getLaneAngle(selectedNote.lane, tunnelRotation);
    const corners = getTrapezoidCorners(
      rayAngle, 
      holdGeometry.nearDistance, 
      holdGeometry.farDistance, 
      vpX, 
      vpY, 
      selectedNote.id
    );
    
    if (!corners) return null;
    
    const { x1, y1, x2, y2, x3, y3, x4, y4 } = corners;
    points = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
    
  } else {
    // TAP note geometry
    const progress = 1 - ((selectedNote.time - currentTime) / LEAD_TIME);
    
    if (progress < 0 || progress > 1.2) return null;
    
    const rayAngle = getLaneAngle(selectedNote.lane, tunnelRotation);
    const tapGeometry = calculateTapNoteGeometry(
      progress, 
      rayAngle, 
      vpX, 
      vpY, 
      false, // isHit
      currentTime,
      false, // isFailed
      selectedNote.time,
      undefined, // failureTime
      false // isTapMissFailure
    );
    
    points = tapGeometry.points;
  }

  // Parse points to get bounding box
  const coords = points.split(' ').map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });

  const minX = Math.min(...coords.map(c => c.x));
  const maxX = Math.max(...coords.map(c => c.x));
  const minY = Math.min(...coords.map(c => c.y));
  const maxY = Math.max(...coords.map(c => c.y));

  const padding = 4;
  
  const rayAngle = getLaneAngle(selectedNote.lane, tunnelRotation);
  
  // Memoize handle positions - expensive geometry calculations
  const { nearHandlePos, farHandlePos } = useMemo(() => {
    let nearPos: { x: number; y: number } | null = null;
    let farPos: { x: number; y: number } | null = null;
  
    if (selectedNote.type === 'HOLD' && selectedNote.duration) {
      // HOLD: start and end handles at trapezoid near edges
      const startProgress = 1 - ((selectedNote.time - currentTime) / LEAD_TIME);
      const endProgress = 1 - ((selectedNote.time + selectedNote.duration - currentTime) / LEAD_TIME);
      
      const startGeometry = calculateDistances(startProgress);
      const endGeometry = calculateDistances(endProgress);
      
      // Get the actual trapezoid corners to position handles at near edge midpoint
      const startCorners = calculateRayCorners(vpX, vpY, rayAngle, startGeometry.nearDistance, startGeometry.farDistance);
      const endCorners = calculateRayCorners(vpX, vpY, rayAngle, endGeometry.nearDistance, endGeometry.farDistance);
      
      // Near (start) handle: midpoint of near edge (x3-x4 or x4-x3)
      nearPos = {
        x: (startCorners.x3 + startCorners.x4) / 2,
        y: (startCorners.y3 + startCorners.y4) / 2
      };
      
      // Far (end) handle: midpoint of near edge at end time
      farPos = {
        x: (endCorners.x3 + endCorners.x4) / 2,
        y: (endCorners.y3 + endCorners.y4) / 2
      };
    } else {
      // TAP: near handle at front edge, far handle at back edge of visual trapezoid
      const noteProgress = 1 - ((selectedNote.time - currentTime) / LEAD_TIME);
      const noteGeometry = calculateDistances(noteProgress);
      
      // Get actual trapezoid corners
      const corners = calculateRayCorners(vpX, vpY, rayAngle, noteGeometry.nearDistance, noteGeometry.farDistance);
      
      // Near handle: midpoint of near edge (front, closest to judgment)
      nearPos = {
        x: (corners.x3 + corners.x4) / 2,
        y: (corners.y3 + corners.y4) / 2
      };
      
      // Far handle: midpoint of far edge (back, closest to VP)
      farPos = {
        x: (corners.x1 + corners.x2) / 2,
        y: (corners.y1 + corners.y2) / 2
      };
    }
    
    return { nearHandlePos: nearPos, farHandlePos: farPos };
  }, [selectedNote, currentTime, vpX, vpY, rayAngle]);

  return (
    <svg 
      className="absolute inset-0" 
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`, 
        pointerEvents: 'none',
        margin: '0 auto',
        zIndex: 15
      }}
    >
      {/* Bounding box rectangle */}
      <rect
        x={minX - padding}
        y={minY - padding}
        width={maxX - minX + padding * 2}
        height={maxY - minY + padding * 2}
        fill="none"
        stroke="cyan"
        strokeWidth={2}
        strokeDasharray="4 4"
        opacity={0.8}
        style={{ 
          pointerEvents: 'none',
          animation: 'dash 1s linear infinite'
        }}
      />
      
      {/* Time handles - draggable for start/end adjustment */}
      {nearHandlePos && (
        <g
          onMouseDown={(e) => {
            e.stopPropagation();
            const handle: HandleType = selectedNote.type === 'HOLD' ? 'start' : 'near';
            onHandleMouseDown(selectedNote.id, handle, e);
          }}
          style={{ cursor: 'ew-resize', pointerEvents: 'auto' }}
        >
          <circle 
            cx={nearHandlePos.x} 
            cy={nearHandlePos.y} 
            r={8} 
            fill="rgba(0, 255, 255, 0.2)" 
            stroke="cyan"
            strokeWidth={2}
          />
          <circle 
            cx={nearHandlePos.x} 
            cy={nearHandlePos.y} 
            r={3} 
            fill="cyan"
          />
        </g>
      )}
      
      {farHandlePos && (
        <g
          onMouseDown={(e) => {
            e.stopPropagation();
            const handle: HandleType = selectedNote.type === 'HOLD' ? 'end' : 'far';
            onHandleMouseDown(selectedNote.id, handle, e);
          }}
          style={{ cursor: 'ew-resize', pointerEvents: 'auto' }}
        >
          <circle 
            cx={farHandlePos.x} 
            cy={farHandlePos.y} 
            r={8} 
            fill="rgba(0, 255, 255, 0.2)" 
            stroke="cyan"
            strokeWidth={2}
          />
          <circle 
            cx={farHandlePos.x} 
            cy={farHandlePos.y} 
            r={3} 
            fill="cyan"
          />
        </g>
      )}
      
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -8;
          }
        }
      `}</style>
    </svg>
  );
};

export const SelectionBoundingBox = memo(SelectionBoundingBoxComponent);
