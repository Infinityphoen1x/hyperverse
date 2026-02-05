import { memo } from 'react';
import { generateBeatGrid } from '@/lib/editor/editorUtils';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, TUNNEL_MAX_DISTANCE, MAGIC_MS, TAP_JUDGEMENT_LINE_WIDTH } from '@/lib/config';
import { JUDGEMENT_RADIUS } from '@/lib/config/geometry';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';
import { useGameStore } from '@/stores/useGameStore';

interface EditorBeatGridProps {
  currentTime: number;
  bpm: number;
  snapDivision: 1 | 2 | 4 | 8 | 16;
  vpX: number;
  vpY: number;
}

// Line angles matching TAP judgement lines + HOLD deck lines
const GRID_LINE_ANGLES = [120, 60, 300, 240, 180, 0];

const EditorBeatGridComponent = ({ currentTime, bpm, snapDivision, vpX, vpY }: EditorBeatGridProps) => {
  const tunnelRotation = useTunnelRotation();
  const playerSpeed = useGameStore(state => state.playerSpeed) || 40;
  
  // Calculate effective lead time based on player speed
  const effectiveLeadTime = MAGIC_MS / playerSpeed;
  
  // DEBUG: Log input props
  if (!isFinite(vpX) || !isFinite(vpY)) {
    // console.error('[EditorBeatGrid] NaN in props:', { vpX, vpY, currentTime, bpm, snapDivision });
  }
  
  // Sanitize VP coordinates to prevent NaN propagation
  const safeVpX = isFinite(vpX) ? vpX : VANISHING_POINT_X;
  const safeVpY = isFinite(vpY) ? vpY : VANISHING_POINT_Y;
  
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
      {generateBeatGrid(currentTime, bpm, snapDivision, effectiveLeadTime, JUDGEMENT_RADIUS, 0).map((gridPoint, i) => {
        // gridPoint.distance is in range [1, JUDGEMENT_RADIUS]
        // Calculate progress: 0 at VP (distance = 1), 1 at judgement (distance = JUDGEMENT_RADIUS)
        const progress = (gridPoint.distance - 1) / (JUDGEMENT_RADIUS - 1);
        
        // Visual properties that scale with progress
        const strokeWidth = 1.5 + progress * 1.0; // Thinner than judgement lines
        const opacity = 0.2 + progress * 0.3; // Fade in as approaching
        
        // Line length scales with distance for perspective shortening/lengthening
        // Use actual distance ratio for true perspective scaling
        const perspectiveScale = gridPoint.distance / JUDGEMENT_RADIUS;
        const baseLineWidth = TAP_JUDGEMENT_LINE_WIDTH * 1.2; // 20% longer than judgement lines
        const lineWidth = baseLineWidth * perspectiveScale; // Full perspective scaling
        
        // Draw lines at each angle (matching tap judgement line angles)
        return GRID_LINE_ANGLES.map((angle, lineIdx) => {
          // Calculate fixed outer corner position (no additional rotation - SVG container handles it)
          const rad = (angle * Math.PI) / 180;
          const outerCornerX = safeVpX + TUNNEL_MAX_DISTANCE * Math.cos(rad);
          const outerCornerY = safeVpY + TUNNEL_MAX_DISTANCE * Math.sin(rad);
          
          // Calculate actual ray length from VP to outer corner (accounts for dynamic VP)
          const rayLength = Math.sqrt(
            (outerCornerX - safeVpX) * (outerCornerX - safeVpX) + 
            (outerCornerY - safeVpY) * (outerCornerY - safeVpY)
          );
          
          // Position line along ray from VP to outer corner at gridPoint.distance
          // Use actual ray length instead of TUNNEL_MAX_DISTANCE for proper perspective
          const lineProgress = gridPoint.distance / rayLength;
          const cx = safeVpX + (outerCornerX - safeVpX) * lineProgress;
          const cy = safeVpY + (outerCornerY - safeVpY) * lineProgress;
          
          // Calculate perpendicular direction for line width
          const rayAngle = Math.atan2(outerCornerY - safeVpY, outerCornerX - safeVpX);
          const perpRad = rayAngle + Math.PI / 2;
          const x1 = cx + Math.cos(perpRad) * (lineWidth / 2);
          const y1 = cy + Math.sin(perpRad) * (lineWidth / 2);
          const x2 = cx - Math.cos(perpRad) * (lineWidth / 2);
          const y2 = cy - Math.sin(perpRad) * (lineWidth / 2);
          
          return (
            <line
              key={`beat-grid-${i}-${gridPoint.time}-${lineIdx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(0, 255, 255, 0.6)"
              strokeWidth={strokeWidth}
              opacity={opacity}
              strokeLinecap="round"
            />
          );
        });
      })}
    </svg>
  );
};

export const EditorBeatGrid = memo(EditorBeatGridComponent);
