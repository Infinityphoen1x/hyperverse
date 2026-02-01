import { generateBeatGrid } from '@/lib/editor/editorUtils';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, TUNNEL_MAX_DISTANCE } from '@/lib/config';
import { JUDGEMENT_RADIUS, HEXAGON_RADII } from '@/lib/config/geometry';
import { LEAD_TIME } from '@/lib/config/timing';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';

interface EditorBeatGridProps {
  currentTime: number;
  bpm: number;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  vpX: number;
  vpY: number;
}

export function EditorBeatGrid({ currentTime, bpm, snapDivision, vpX, vpY }: EditorBeatGridProps) {
  const tunnelRotation = useTunnelRotation();
  
  // DEBUG: Log input props
  if (!isFinite(vpX) || !isFinite(vpY)) {
    console.error('[EditorBeatGrid] NaN in props:', { vpX, vpY, currentTime, bpm, snapDivision });
  }
  
  // Sanitize VP coordinates to prevent NaN propagation
  const safeVpX = isFinite(vpX) ? vpX : VANISHING_POINT_X;
  const safeVpY = isFinite(vpY) ? vpY : VANISHING_POINT_Y;
  
  // Use the maximum hexagon radius as reference (248)
  const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  
  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`,
        margin: '0 auto',
        transform: `rotate(${tunnelRotation}deg)`,
        transformOrigin: `${safeVpX}px ${safeVpY}px`
      }}
    >
      {generateBeatGrid(currentTime, bpm, snapDivision, LEAD_TIME, JUDGEMENT_RADIUS, 0).map((gridPoint, i) => {
        // gridPoint.distance is in range [1, JUDGEMENT_RADIUS]
        // Map this to actual hexagon radius using the same formula as notes
        // progress = 0 at VP (distance = 1), progress = 1 at judgement (distance = JUDGEMENT_RADIUS)
        const progress = (gridPoint.distance - 1) / (JUDGEMENT_RADIUS - 1);
        
        // Calculate hexagon radius using the same scaling as tunnel hexagons
        const hexRadius = progress * maxRadius;
        
        // Draw hexagon by calculating vertices along the 6 rays
        const hexPoints = Array.from({ length: 6 }).map((_, vertexIdx) => {
          const angle = (vertexIdx * 60 * Math.PI) / 180;
          
          // Calculate fixed outer corner position at max distance
          const outerCornerX = safeVpX + TUNNEL_MAX_DISTANCE * Math.cos(angle);
          const outerCornerY = safeVpY + TUNNEL_MAX_DISTANCE * Math.sin(angle);
          
          // Position vertex along ray from VP to outer corner based on hexRadius
          const vertexProgress = hexRadius / maxRadius;
          const x = safeVpX + (outerCornerX - safeVpX) * vertexProgress;
          const y = safeVpY + (outerCornerY - safeVpY) * vertexProgress;
          
          return `${x},${y}`;
        }).join(' ');
        
        // Visual properties that scale with progress
        const strokeWidth = 0.5 + progress * 1.5;
        const opacity = 0.15 + progress * 0.25;
        
        return (
          <polygon
            key={`beat-grid-${i}-${gridPoint.time}`}
            points={hexPoints}
            fill="none"
            stroke="rgba(0, 255, 255, 0.6)"
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
