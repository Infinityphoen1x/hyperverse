import { generateBeatGrid } from '@/lib/editor/editorUtils';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
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
  
  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`,
        margin: '0 auto',
        transform: `rotate(${tunnelRotation}deg)`,
        transformOrigin: `${vpX}px ${vpY}px`
      }}
    >
      {generateBeatGrid(currentTime, bpm, snapDivision, LEAD_TIME, JUDGEMENT_RADIUS, 40).map((gridPoint, i) => {
        // Calculate hexagon size based on distance from VP (parallax effect)
        const scale = gridPoint.distance / JUDGEMENT_RADIUS;
        const hexSize = scale * JUDGEMENT_RADIUS;
        
        // Draw hexagon by connecting 6 points at 60° intervals
        const hexAngles = [0, 60, 120, 180, 240, 300];
        const hexPoints = hexAngles.map(angle => {
          const rad = (angle * Math.PI) / 180;
          const x = vpX + hexSize * Math.cos(rad);
          const y = vpY + hexSize * Math.sin(rad);
          return `${x},${y}`;
        }).join(' ');
        
        return (
          <polygon
            key={`beat-grid-${i}`}
            points={hexPoints}
            fill="none"
            stroke="rgba(0, 255, 255, 0.15)"
            strokeWidth="1.5"
            opacity={scale * 0.8}
          />
        );
      })}
    </svg>
  );
}
