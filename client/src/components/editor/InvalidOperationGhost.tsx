/**
 * Red ghost preview for invalid note operations
 * Shows when drag would cause overlap or invalid duration
 */

import { Note } from '@/types/game';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { LEAD_TIME } from '@/lib/config/timing';
import { calculateDistances, calculateRayCorners } from '@/lib/geometry/tapNoteGeometry';
import { calculateApproachGeometry } from '@/lib/geometry/holdNoteGeometry';
import { getLaneAngle } from '@/lib/utils/laneUtils';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';

interface InvalidOperationGhostProps {
  note: Note | null;
  currentTime: number;
  vpX: number;
  vpY: number;
  errorMessage?: string;
}

export function InvalidOperationGhost({ note, currentTime, vpX, vpY, errorMessage }: InvalidOperationGhostProps) {
  const tunnelRotation = useTunnelRotation();
  
  if (!note) return null;

  const timeUntilHit = note.time - currentTime;
  const progress = 1 - (timeUntilHit / LEAD_TIME);
  
  // Don't render if too far or past judgment line
  if (progress < 0 || progress > 1.2) return null;

  const laneRayAngle = getLaneAngle(note.lane, tunnelRotation);

  // Calculate geometry based on note type
  let nearDistance: number;
  let farDistance: number;

  if (note.type === 'HOLD' && note.duration) {
    const holdGeometry = calculateApproachGeometry(
      timeUntilHit,
      0,
      false,
      note.duration,
      false,
      false,
      LEAD_TIME
    );
    nearDistance = holdGeometry.nearDistance;
    farDistance = holdGeometry.farDistance;
  } else {
    const geometry = calculateDistances(progress);
    nearDistance = geometry.nearDistance;
    farDistance = geometry.farDistance;
  }

  const corners = calculateRayCorners(vpX, vpY, laneRayAngle, nearDistance, farDistance);

  return (
    <>
      <svg 
        className="absolute inset-0 pointer-events-none" 
        style={{ 
          width: `${TUNNEL_CONTAINER_WIDTH}px`, 
          height: `${TUNNEL_CONTAINER_HEIGHT}px`,
          margin: '0 auto'
        }}
      >
        {/* Red ghost trapezoid */}
        <polygon
          points={`${corners.x1},${corners.y1} ${corners.x2},${corners.y2} ${corners.x3},${corners.y3} ${corners.x4},${corners.y4}`}
          fill="rgba(255, 0, 0, 0.3)"
          stroke="rgba(255, 0, 0, 0.8)"
          strokeWidth={2}
          className="animate-pulse"
        />
      </svg>
      
      {/* Error tooltip */}
      {errorMessage && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{
            left: `${vpX}px`,
            top: `${vpY - 80}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-red-900/90 border-2 border-red-500 rounded px-3 py-2 text-white text-sm font-rajdhani shadow-lg">
            {errorMessage}
          </div>
        </div>
      )}
    </>
  );
}
