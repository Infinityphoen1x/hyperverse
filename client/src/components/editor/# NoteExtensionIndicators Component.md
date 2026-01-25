# NoteExtensionIndicators Component

White indicator lines showing where note handles can be dragged.  
Appears at the start and end positions of **selected notes**.  
Reuses note geometry calculations to minimize duplication.

## Purpose

- Visualize draggable handles for resizing HOLD notes (start/end)
- Visualize the effective hit window boundaries for TAP notes
- Lines appear as thin white strokes at the near and/or far edges
- Matches the perspective geometry used in actual note rendering

## Features

- **HOLD notes**: Shows indicators at both the near (start) and far (end) edges of the hold trapezoid
- **TAP notes**: Shows two thin lines at `time - TAP_HIT_WINDOW` and `time + TAP_HIT_WINDOW`
- Uses tunnel rotation via `useTunnelRotation()`
- Reuses `calculateRayCorners`, `calculateDistances`, `calculateApproachGeometry`
- SVG overlay, pointer-events-none (non-interactive)

## Code

```tsx
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
              strokeWidth={EXTENSION_INDICATOR_STROKE_WIDTH}
              opacity={EXTENSION_INDICATOR_OPACITY}
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
                strokeWidth={EXTENSION_INDICATOR_STROKE_WIDTH}
                opacity={EXTENSION_INDICATOR_OPACITY}
                strokeLinecap="round"
              />
              {/* Line at far edge (toward vanishing point) - x1 to x2 */}
              <line
                x1={corners.x1}
                y1={corners.y1}
                x2={corners.x2}
                y2={corners.y2}
                stroke="white"
                strokeWidth={EXTENSION_INDICATOR_STROKE_WIDTH}
                opacity={EXTENSION_INDICATOR_OPACITY}
                strokeLinecap="round"
              />
            </g>
          );
        }
      })}
    </svg>
  );
}
  Known Issues / Debugging Notes

Indicators only appear when a note is selected (selectedNote !== null)
For HOLD notes: currently recalculates progress separately instead of using holdGeometry.nearDistance / farDistance directly → may cause misalignment
TAP indicators often invisible if note is near/currently at judgment line (progress out of [0, MAX_PROGRESS])
No handling for multi-selected notes (only shows for single selectedNote)
SVG assumes TUNNEL_CONTAINER_WIDTH/HEIGHT match the parent container exactly

Potential Improvements

Use actual holdGeometry.nearDistance and farDistance for HOLD notes
Add support for multi-selection (show indicators for all selected notes)
Fade opacity based on how close to edge (0–1 progress)
Different colors/styles for active drag handle
Add small circle markers at handle positions for better click target visibility