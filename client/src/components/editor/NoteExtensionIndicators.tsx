/**
 * White indicator lines showing where note handles can be dragged
 * Appears at the start and end positions of selected notes
 * Reuses note geometry calculations to minimize duplication
 */

import { Note } from '@/types/game';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';
import { LEAD_TIME } from '@/lib/config/timing';
import { calculateDistances, calculateRayCorners } from '@/lib/geometry/tapNoteGeometry';
import { calculateApproachGeometry } from '@/lib/geometry/holdNoteGeometry';
import { getLaneAngle } from '@/lib/utils/laneUtils';
import { useTunnelRotation } from '@/hooks/useTunnelRotation';

interface NoteExtensionIndicatorsProps {
  selectedNote: Note | null;
  currentTime: number;
  vpX: number;
  vpY: number;
}

export function NoteExtensionIndicators({ selectedNote, currentTime, vpX, vpY }: NoteExtensionIndicatorsProps) {
  const tunnelRotation = useTunnelRotation();
  
  if (!selectedNote) return null;

  // Build indicators for start and end positions
  const indicators: Array<{ nearDistance: number; farDistance: number; label: string }> = [];

  if (selectedNote.type === 'HOLD' && selectedNote.duration) {
    // For HOLD notes, use the same geometry calculation as hold note rendering
    // This ensures white lines match the actual trapezoid edges
    const timeUntilHit = selectedNote.time - currentTime;
    const holdDuration = selectedNote.duration;
    
    // Calculate geometry for the entire hold note using the same function as rendering
    // useFixedDepth=false means both ends approach independently (dynamic mode)
    const holdGeometry = calculateApproachGeometry(
      timeUntilHit, 
      0, // pressHoldTime - not pressed in editor
      false, // isTooEarlyFailure
      holdDuration,
      false, // isHoldMissFailure
      false, // useFixedDepth - use dynamic mode
      LEAD_TIME // effectiveLeadTime - editor uses base LEAD_TIME
    );
    
    // The hold geometry gives us the full trapezoid
    // nearDistance = where note.time is (start handle)
    // farDistance = where note.time + duration is (end handle)
    
    // For white lines, we want to show indicators at both ends
    // Start handle: at nearDistance (the near edge of the hold note)
    // End handle: at farDistance (the far edge of the hold note)
    
    // Check if start is visible
    const startProgress = 1 - (timeUntilHit / LEAD_TIME);
    if (startProgress >= 0 && startProgress <= 1) {
      // For start handle, use tap note geometry to get the depth at that time point
      const startGeometry = calculateDistances(startProgress);
      indicators.push({ nearDistance: startGeometry.nearDistance, farDistance: startGeometry.farDistance, label: 'start' });
    }
    
    // Check if end is visible
    const endProgress = 1 - ((timeUntilHit + holdDuration) / LEAD_TIME);
    if (endProgress >= 0 && endProgress <= 1) {
      // For end handle, use tap note geometry to get the depth at the end time
      const endGeometry = calculateDistances(endProgress);
      indicators.push({ nearDistance: endGeometry.nearDistance, farDistance: endGeometry.farDistance, label: 'end' });
    }
  } else {
    // For TAP notes, show indicators at both near and far edges
    // This allows adjusting the visual depth of the note
    const startProgress = 1 - ((selectedNote.time - currentTime) / LEAD_TIME);
    if (startProgress >= 0 && startProgress <= 1) {
      const { nearDistance, farDistance } = calculateDistances(startProgress);
      
      // Create separate indicators for near and far edges
      // This allows the user to drag each edge independently
      // Near edge indicator (closest to player)
      indicators.push({ 
        nearDistance: nearDistance, 
        farDistance: nearDistance, // Single line at near position
        label: 'near' 
      });
      
      // Far edge indicator (toward vanishing point)
      indicators.push({ 
        nearDistance: farDistance, 
        farDistance: farDistance, // Single line at far position
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
        const corners = calculateRayCorners(vpX, vpY, laneRayAngle, indicator.nearDistance, indicator.farDistance);
        
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
              stroke="white"
              strokeWidth="3"
              opacity="0.8"
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
                stroke="white"
                strokeWidth="3"
                opacity="0.8"
                strokeLinecap="round"
              />
              {/* Line at far edge (toward vanishing point) - x1 to x2 */}
              <line
                x1={corners.x1}
                y1={corners.y1}
                x2={corners.x2}
                y2={corners.y2}
                stroke="white"
                strokeWidth="3"
                opacity="0.8"
                strokeLinecap="round"
              />
            </g>
          );
        }
      })}
    </svg>
  );
}
