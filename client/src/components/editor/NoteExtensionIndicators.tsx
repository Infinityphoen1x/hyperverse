/**
 * White indicator lines showing where note handles can be dragged
 * Appears at the start and end positions of selected notes
 * Reuses note geometry calculations to minimize duplication
 */

import { Note } from '@/types/game';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { LEAD_TIME, GAME_CONFIG } from '@/lib/config/timing';
import { 
  EXTENSION_INDICATOR_MAX_PROGRESS, 
  EXTENSION_INDICATOR_STROKE_WIDTH, 
  EXTENSION_INDICATOR_OPACITY 
} from '@/lib/config/editor';
import { calculateDistances, calculateRayCorners } from '@/lib/geometry/tapNoteGeometry';
import { calculateApproachGeometry } from '@/lib/geometry/holdNoteGeometry';
import { getLaneAngle } from '@/lib/utils/laneUtils';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';

const TAP_HIT_WINDOW = GAME_CONFIG.TAP_HIT_WINDOW;

interface NoteExtensionIndicatorsProps {
  selectedNote: Note | null;
  currentTime: number;
  vpX: number;
  vpY: number;
}

export function NoteExtensionIndicators({ selectedNote, currentTime, vpX, vpY }: NoteExtensionIndicatorsProps) {
  // Safety check for NaN values
  const safeVpX = isNaN(vpX) ? 350 : vpX;
  const safeVpY = isNaN(vpY) ? 300 : vpY;
  
  // Early return BEFORE hooks to avoid hook count mismatch
  if (!selectedNote) {
    return null;
  }
  
  const tunnelRotation = useTunnelRotation();

  // Build indicators for start and end positions
  const indicators: Array<{ nearDistance: number; farDistance: number; label: string }> = [];

  if (selectedNote.type === 'HOLD' && selectedNote.duration) {
    // For HOLD notes, show indicators at both start and end positions
    // Calculate each end separately to match actual note rendering
    const timeUntilHit = selectedNote.time - currentTime;
    const holdDuration = selectedNote.duration;
    
    // Check if start is visible
    const startProgress = 1 - (timeUntilHit / LEAD_TIME);
    if (startProgress >= 0 && startProgress <= EXTENSION_INDICATOR_MAX_PROGRESS) {
      // For start handle, use tap note geometry to get the depth at that time point
      const startGeometry = calculateDistances(startProgress);
      indicators.push({ nearDistance: startGeometry.nearDistance, farDistance: startGeometry.farDistance, label: 'start' });
    }
    
    // Check if end is visible
    const endProgress = 1 - ((timeUntilHit + holdDuration) / LEAD_TIME);
    if (endProgress >= 0 && endProgress <= EXTENSION_INDICATOR_MAX_PROGRESS) {
      // For end handle, use tap note geometry to get the depth at the end time
      const endGeometry = calculateDistances(endProgress);
      indicators.push({ nearDistance: endGeometry.nearDistance, farDistance: endGeometry.farDistance, label: 'end' });
    }
  } else {
    // For TAP notes, show handles at the hit window boundaries
    // Near handle: at note.time - TAP_HIT_WINDOW (start of hit window)
    // Far handle: at note.time + TAP_HIT_WINDOW (end of hit window)
    // This visualizes the effective "duration" of the TAP note (the hit window)
    
    const nearHandleTime = selectedNote.time - TAP_HIT_WINDOW;
    const farHandleTime = selectedNote.time + TAP_HIT_WINDOW;
    
    const nearProgress = 1 - ((nearHandleTime - currentTime) / LEAD_TIME);
    const farProgress = 1 - ((farHandleTime - currentTime) / LEAD_TIME);
    
    // Show near handle if it's visible
    // MAX_PROGRESS (1.2) allows slight off-screen rendering for smoother transitions
    if (nearProgress >= 0 && nearProgress <= EXTENSION_INDICATOR_MAX_PROGRESS) {
      const nearGeometry = calculateDistances(nearProgress);
      indicators.push({ 
        nearDistance: nearGeometry.nearDistance, 
        farDistance: nearGeometry.nearDistance, // Single line at near position
        label: 'near' 
      });
    }
    
    // Show far handle if it's visible
    if (farProgress >= 0 && farProgress <= EXTENSION_INDICATOR_MAX_PROGRESS) {
      const farGeometry = calculateDistances(farProgress);
      indicators.push({ 
        nearDistance: farGeometry.nearDistance, 
        farDistance: farGeometry.nearDistance, // Single line at far position
        label: 'far' 
      });
    }
  }

  // Get lane angle with tunnel rotation applied
  const laneRayAngle = getLaneAngle(selectedNote.lane, tunnelRotation);

  return (
    <svg 
      className="absolute inset-0 pointer-events-none" 
      style={{ 
        width: `${TUNNEL_CONTAINER_WIDTH}px`, 
        height: `${TUNNEL_CONTAINER_HEIGHT}px`,
        margin: '0 auto'
      }}
    >
      {indicators.map((indicator, idx) => {
        // Reuse the exact same corner calculation as notes
        const corners = calculateRayCorners(safeVpX, safeVpY, laneRayAngle, indicator.nearDistance, indicator.farDistance);
        
        // Check if this is a single-line indicator (near === far) or dual-line (near !== far)
        const isSingleLine = Math.abs(indicator.nearDistance - indicator.farDistance) < 0.1;
        
        if (isSingleLine) {
          // Single line indicator (for TAP note edges)
          return (
            <line
              key={`extension-indicator-${indicator.label}-${idx}`}
              x1={corners.x4}
              y1={corners.y4}
              x2={corners.x3}
              y2={corners.y3}
              stroke="#00FF00"
              strokeWidth={EXTENSION_INDICATOR_STROKE_WIDTH * 3}
              opacity={1}
              strokeLinecap="round"
            />
          );
        } else {
          // Dual line indicator (for HOLD note handles)
          return (
            <g key={`extension-indicator-${indicator.label}-${idx}`}>
              {/* Line at near edge (closest to player) - x4 to x3 */}
              <line
                x1={corners.x4}
                y1={corners.y4}
                x2={corners.x3}
                y2={corners.y3}
                stroke="#FF00FF"
                strokeWidth={EXTENSION_INDICATOR_STROKE_WIDTH * 3}
                opacity={1}
                strokeLinecap="round"
              />
              {/* Line at far edge (toward vanishing point) - x1 to x2 */}
              <line
                x1={corners.x1}
                y1={corners.y1}
                x2={corners.x2}
                y2={corners.y2}
                stroke="#FFFF00"
                strokeWidth={EXTENSION_INDICATOR_STROKE_WIDTH * 3}
                opacity={1}
                strokeLinecap="round"
              />
            </g>
          );
        }
      })}
    </svg>
  );
}
