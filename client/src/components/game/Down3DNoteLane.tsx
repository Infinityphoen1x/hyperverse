import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

// Extract health-based color calculation for tunnel effects
const getHealthBasedRayColor = (health: number): string => {
  const healthFactor = Math.max(0, 200 - health) / 200; // 0 at full health, 1 at 0 health
  const r = Math.round(0 + (255 - 0) * healthFactor);
  const g = Math.round(255 * (1 - healthFactor));
  const b = Math.round(255 * (1 - healthFactor));
  return `rgba(${r},${g},${b},1)`;
};

// Extract trapezoid corner calculation for cleaner geometry
const getTrapezoidCorners = (
  rayAngle: number,
  nearDistance: number,
  farDistance: number,
  vanishingPointX: number,
  vanishingPointY: number
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } => {
  const leftRayAngle = rayAngle - 15;
  const rightRayAngle = rayAngle + 15;
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;
  
  return {
    x1: vanishingPointX + Math.cos(leftRad) * farDistance,
    y1: vanishingPointY + Math.sin(leftRad) * farDistance,
    x2: vanishingPointX + Math.cos(rightRad) * farDistance,
    y2: vanishingPointY + Math.sin(rightRad) * farDistance,
    x3: vanishingPointX + Math.cos(rightRad) * nearDistance,
    y3: vanishingPointY + Math.sin(rightRad) * nearDistance,
    x4: vanishingPointX + Math.cos(leftRad) * nearDistance,
    y4: vanishingPointY + Math.sin(leftRad) * nearDistance,
  };
};

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
  health?: number;
}

export function Down3DNoteLane({ notes, currentTime, health = 200 }: Down3DNoteLaneProps) {
  // Helper: Calculate phase progress (0 to 2)
  // Phase 1 (0 to 1): Note approaching, trapezoid growing
  // Phase 2 (1 to 2): Note at/past judgement, trapezoid shrinking
  const getPhaseProgress = (timeUntilHit: number, pressTime: number, currentTime: number, holdDuration: number = 1000): number => {
    const LEAD_TIME = 4000;
    
    if (timeUntilHit > 0) {
      // Phase 1: Note approaching
      return (LEAD_TIME - timeUntilHit) / LEAD_TIME;
    } else {
      // Phase 2: Note at/past judgement, shrink based on hold duration from beatmap
      const elapsedHoldTime = currentTime - pressTime;
      return Math.min(1.0 + (elapsedHoldTime / holdDuration), 2.0);
    }
  };

  // Filter visible notes - soundpad notes (0-3) AND deck notes (-1, -2)
  // TAP notes: appear 2000ms before hit, show glitch 500ms after miss, then disappear
  // SPIN (hold) notes: appear 4000ms before, stay visible through hold duration
  // OPTIMIZED: Early exit for notes that are too old, single pass, minimal allocations
  const visibleNotes = Array.isArray(notes) ? (() => {
    const result: typeof notes = [];
    
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      try {
        if (!n || !Number.isFinite(n.time) || !Number.isFinite(currentTime)) {
          continue; // Skip invalid notes
        }
        
        const timeUntilHit = n.time - currentTime;
        
        if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
          // Hold notes: keep ALL hold notes visible including missed ones
          // Filter out only HITS (successful holds)
          if (n.hit) continue;
          // Missed holds stay visible for 500ms after note.time
          if (n.missed && timeUntilHit < -500) continue;
          
          // Determine visibility window: extend for failure animations
          let visibilityEnd = -2000; // Default window end (2000ms after note.time)
          if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
            // Failure animations run for 1100ms from failureTime
            // Animation completes at: failureTime + 1100
            // In terms of timeUntilHit: need to stay visible until currentTime >= failureTime + 1100
            // Which means: timeUntilHit = note.time - currentTime > note.time - (failureTime + 1100)
            // So: visibilityEnd = note.time - (failureTime + 1100) = -(failureTime - note.time) - 1100
            const failureTime = n.failureTime || currentTime; // Fallback to current if missing
            const timeSinceNoteTime = failureTime - n.time;
            visibilityEnd = -(timeSinceNoteTime + 1100);
          }
          
          // Visibility window: 4000ms before (lead time) to end of failure animation
          if (timeUntilHit >= visibilityEnd && timeUntilHit <= 4000) {
            result.push(n);
          }
        } else {
          // TAP notes: show 2000ms before to 500ms after miss
          if (timeUntilHit > 2000) continue; // Too early, can skip rest
          if (n.hit) continue;
          if (n.missed && timeUntilHit < -500) continue;
          // Show note 2000ms before or during 500ms glitch window after miss
          if (timeUntilHit <= 2000 && timeUntilHit >= -500) {
            result.push(n);
          }
        }
      } catch (error) {
        console.warn(`Note visibility filter error: ${error}`);
      }
    }
    
    return result;
  })() : [];


  const getNoteKey = (lane: number): string => {
    if (lane === -1) return 'Q';
    if (lane === -2) return 'P';
    return ['W', 'O', 'I', 'E'][lane];
  };

  const getColorForLane = (lane: number): string => {
    const baseColor = (() => {
      switch (lane) {
        case -1: return '#00FF00'; // Q - green
        case -2: return '#FF0000'; // P - red
        case 0: return '#FF007F'; // W - pink (bottom-left)
        case 1: return '#0096FF'; // O - blue (bottom-right)
        case 2: return '#BE00FF'; // I - purple (top-right)
        case 3: return '#00FFFF'; // E - cyan (top-left)
        default: return '#FFFFFF';
      }
    })();
    
    // Shift towards red (#FF0000) as health decreases (0-200 range)
    const healthFactor = Math.max(0, 200 - health) / 200; // 0 at 200 health, 1 at 0 health
    if (healthFactor === 0) return baseColor;
    
    // Parse base color to RGB
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    
    // Interpolate towards red (#FF, #00, #00)
    const newR = Math.round(r + (255 - r) * healthFactor);
    const newG = Math.round(g * (1 - healthFactor));
    const newB = Math.round(b * (1 - healthFactor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase();
  };

  // 6 equally-spaced rays at 60° intervals
  const allRayAngles = [0, 60, 120, 180, 240, 300];

  // Map lanes to rays
  const getLaneAngle = (lane: number): number => {
    const rayMapping: Record<number, number> = {
      [-2]: 0,     // P - right deck
      [-1]: 180,   // Q - left deck
      [0]: 120,    // W - top-left pad
      [1]: 60,     // O - top-right pad
      [2]: 300,    // I - bottom-right pad
      [3]: 240,    // E - bottom-left pad
    };
    const angle = rayMapping[lane];
    if (!Number.isFinite(angle)) {
      console.warn(`Invalid lane: ${lane}, using default angle 0`);
      return 0; // Fallback to 0 degrees
    }
    return angle;
  };

  const VANISHING_POINT_X = 350;
  const VANISHING_POINT_Y = 200;
  const MAX_DISTANCE = 260;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Star tunnel container - centered */}
      <div 
        className="relative"
        style={{
          width: '700px',
          height: '600px',
          margin: '0 auto',
        }}
      >
        {/* SVG for tunnel with concentric circles and variable-width lines */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 1 }}
        >
          {/* Concentric hexagons - faint tunnel walls with variable thickness */}
          {[22, 52, 89, 135, 187, 248].map((radius, idx) => {
            const maxRadius = 248;
            const progress = radius / maxRadius; // 0 to 1, thinner at center to thicker at edge
            
            // Generate hexagon points
            const points = Array.from({ length: 6 }).map((_, i) => {
              const angle = (i * 60 * Math.PI) / 180;
              const x = VANISHING_POINT_X + radius * Math.cos(angle);
              const y = VANISHING_POINT_Y + radius * Math.sin(angle);
              return `${x},${y}`;
            }).join(' ');
            
            // Stroke width: thin at vanishing point (0.3), thick at edge (3.8)
            const strokeWidth = 0.3 + progress * 3.5;
            // Opacity: translucent at center (0.08), more visible at edge (0.3)
            const opacity = 0.08 + progress * 0.22;
            
            const rayColor = getHealthBasedRayColor(health);
            
            return (
              <polygon
                key={`tunnel-hexagon-${idx}`}
                points={points}
                fill="none"
                stroke={rayColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
            );
          })}

          {/* Vanishing point - nearly invisible */}
          <circle cx={VANISHING_POINT_X} cy={VANISHING_POINT_Y} r="6" fill="rgba(0,255,255,0.05)" />
          
          {/* Judgement line indicators - perpendicular to rays */}
          {/* Second-last ring is at radius 187 */}
          {[
            { angle: 120, color: '#FF007F', key: 'W' },   // W (lane 0) - top-left pink
            { angle: 60, color: '#0096FF', key: 'O' },    // O (lane 1) - top-right blue
            { angle: 300, color: '#BE00FF', key: 'I' },   // I (lane 2) - bottom-right purple
            { angle: 240, color: '#00FFFF', key: 'E' },   // E (lane 3) - bottom-left cyan
          ].map((lane, idx) => {
            const rad = (lane.angle * Math.PI) / 180;
            const radius = 187;
            const lineLength = 35;
            
            // Point on the ray at the radius
            const cx = VANISHING_POINT_X + Math.cos(rad) * radius;
            const cy = VANISHING_POINT_Y + Math.sin(rad) * radius;
            
            // Perpendicular direction (rotate 90 degrees)
            const perpRad = rad + Math.PI / 2;
            const x1 = cx + Math.cos(perpRad) * (lineLength / 2);
            const y1 = cy + Math.sin(perpRad) * (lineLength / 2);
            const x2 = cx - Math.cos(perpRad) * (lineLength / 2);
            const y2 = cy - Math.sin(perpRad) * (lineLength / 2);
            
            return (
              <g key={`judgement-line-${idx}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={lane.color}
                  strokeWidth="2.5"
                  opacity="1"
                  strokeLinecap="round"
                />
                {/* Key indicator circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="16"
                  fill={`${lane.color}33`}
                  stroke={lane.color}
                  strokeWidth="2"
                  opacity="0.8"
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={lane.color}
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="Orbitron, monospace"
                  opacity="1"
                >
                  {lane.key}
                </text>
              </g>
            );
          })}
          
          {/* Variable-width lines for tunnel rays - 6 equally spaced rays that shift toward red at low health */}
          {allRayAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            
            const rayColor = getHealthBasedRayColor(health);
            
            // Create line with multiple segments for smooth thickness and opacity gradient
            const segments = 12;
            return (
              <g key={`spoke-group-${angle}`}>
                {Array.from({ length: segments }).map((_, segIdx) => {
                  const segProgress = (segIdx + 1) / segments;
                  
                  // Start point
                  const x1 = VANISHING_POINT_X + Math.cos(rad) * (1 + segProgress * MAX_DISTANCE - (MAX_DISTANCE / segments));
                  const y1 = VANISHING_POINT_Y + Math.sin(rad) * (1 + segProgress * MAX_DISTANCE - (MAX_DISTANCE / segments));
                  
                  // End point
                  const x2 = VANISHING_POINT_X + Math.cos(rad) * (1 + segProgress * MAX_DISTANCE);
                  const y2 = VANISHING_POINT_Y + Math.sin(rad) * (1 + segProgress * MAX_DISTANCE);
                  
                  // Stroke width: thin at vanishing point, thick at edge
                  const strokeWidth = 0.3 + segProgress * 3.5;
                  
                  // Opacity: translucent at vanishing point, more visible at edge
                  const opacity = 0.1 + segProgress * 0.4;
                  
                  return (
                    <line 
                      key={`segment-${angle}-${segIdx}`}
                      x1={x1} 
                      y1={y1} 
                      x2={x2} 
                      y2={y2} 
                      stroke={rayColor}
                      strokeWidth={strokeWidth}
                      opacity={opacity}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hold note trapezoids rendered as SVG polygons */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 1, pointerEvents: 'none' }}
        >
          {visibleNotes
            .filter(n => n && (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && n.id)
            .map(note => {
              try {
                if (!note || !Number.isFinite(note.time) || !note.id) {
                  return null; // Skip corrupted notes
                }

                const timeUntilHit = note.time - currentTime;
                const LEAD_TIME = 4000; // Hold notes appear 4000ms before hit
                const JUDGEMENT_RADIUS = 187;
                
                if (!Number.isFinite(timeUntilHit) || !Number.isFinite(LEAD_TIME)) {
                  return null; // Skip if calculations would be invalid
                }
                
                const pressTime = note.pressTime || 0;
                const holdDuration = note.duration || 1000; // Use beatmap duration, fallback to 1000ms
                const isCurrentlyHeld = pressTime > 0;
                const isTooEarlyFailure = note.tooEarlyFailure || false;
                const isHoldReleaseFailure = note.holdReleaseFailure || false;
                const isHoldMissFailure = note.holdMissFailure || false;
                
                // Define timing windows - accuracy-based (pure time-based, decoupled from deck dots)
                const ACTIVATION_WINDOW = 300;
                const timeSinceNoteSpawn = pressTime - note.time;
                const isTooEarly = isCurrentlyHeld && Math.abs(timeSinceNoteSpawn) > ACTIVATION_WINDOW;
                const isValidActivation = isCurrentlyHeld && !isTooEarly;
                
                let holdProgress = 0;
                let isGreyed = false;
                
                // Determine holdProgress based on note state
                if (isTooEarlyFailure) {
                  isGreyed = true;
                  // Always shrink immediately, locked to press position - regardless of phase
                  const failureTime = note.failureTime;
                  if (!failureTime) {
                    console.warn(`tooEarlyFailure missing failureTime: ${note.id}`);
                    return null;
                  }
                  const timeSinceShrinkStart = Math.max(0, currentTime - failureTime);
                  if (timeSinceShrinkStart > 1100) return null;
                  // Lock to press time position, then show shrinking
                  const timeUntilHitAtPress = note.time - pressTime;
                  const holdProgressAtPress = (LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME;
                  const shrinkProgress = Math.min(timeSinceShrinkStart / 1000, 1.0);
                  // Show shrinking animation, locked to where it was pressed
                  holdProgress = Math.min(holdProgressAtPress, 1.0) + (shrinkProgress * (1.0 - Math.min(holdProgressAtPress, 1.0)));
                } else if (isHoldReleaseFailure || isHoldMissFailure) {
                  isGreyed = true;
                  const failureTime = note.failureTime;
                  if (!failureTime) {
                    console.warn(`Failure note missing failureTime: ${note.id}`);
                    return null;
                  }
                  const timeSinceShrinkStart = Math.max(0, currentTime - failureTime);
                  if (timeSinceShrinkStart > 1100) return null;
                  // Lock to press time position for geometry, show shrinking
                  if (pressTime > 0) {
                    const timeUntilHitAtPress = note.time - pressTime;
                    const holdProgressAtPress = (LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME;
                    const shrinkProgress = Math.min(timeSinceShrinkStart / 1000, 1.0);
                    holdProgress = Math.min(holdProgressAtPress, 1.0) + (shrinkProgress * (1.0 - Math.min(holdProgressAtPress, 1.0)));
                  } else {
                    const shrinkProgress = Math.min(timeSinceShrinkStart / 1000, 1.0);
                    holdProgress = 1.0 + shrinkProgress;
                  }
                } else if (isCurrentlyHeld && isValidActivation && !isTooEarlyFailure && !isHoldReleaseFailure && !isHoldMissFailure) {
                  holdProgress = getPhaseProgress(timeUntilHit, pressTime, currentTime, holdDuration);
                } else if (isCurrentlyHeld && note.hit) {
                  const timeSincePress = currentTime - pressTime;
                  if (timeSincePress > 2000) return null;
                  holdProgress = getPhaseProgress(timeUntilHit, pressTime, currentTime, holdDuration);
                } else if (isCurrentlyHeld) {
                  holdProgress = getPhaseProgress(timeUntilHit, pressTime, currentTime, holdDuration);
                } else {
                  holdProgress = timeUntilHit > 0 ? (LEAD_TIME - timeUntilHit) / LEAD_TIME : 0.99;
                }
                
                // Validate holdProgress
                if (!Number.isFinite(holdProgress)) {
                  holdProgress = 0;
                }
              
              // Get ray angle
              const rayAngle = getLaneAngle(note.lane);
              if (!Number.isFinite(rayAngle)) {
                console.warn(`Invalid ray angle for lane ${note.lane}`);
                return null;
              }
              const rad = (rayAngle * Math.PI) / 180;
              
              // Get flanking ray angles (±15° from center ray)
              // These are only used for trapezoid geometry, not rendered as separate rays
              const leftRayAngle = rayAngle - 15;
              const rightRayAngle = rayAngle + 15;
              const leftRad = (leftRayAngle * Math.PI) / 180;
              const rightRad = (rightRayAngle * Math.PI) / 180;
              
              // holdProgress goes from 0 to 2 over the full visible window
              // PHASE 1 (0 to 1.0): Note approaches, trapezoid GROWS from vanishing point to judgement line
              // PHASE 2 (1.0 to 2.0): Held, trapezoid SHRINKS back: near end stays at judgement, far end moves toward it
              
              const isInPhase2 = holdProgress >= 1.0;
              
              // PHASE 1 (0 to 1.0): Near end grows from vanishing point (1) toward judgement line (187)
              // PHASE 2 (1.0 to 2.0): Far end shrinks back from vanishing point toward judgement line
              
              // During Phase 2, trapezoid shrinks: both ends move toward judgement line
              // But maintain minimum size to stay visible
              let nearDistance, farDistance;
              
              if (!isInPhase2) {
                // Phase 1: Growing - near end moves toward judgement line, far stays at vanishing
                nearDistance = 1 + (holdProgress * (JUDGEMENT_RADIUS - 1));
                farDistance = 1;
              } else {
                // Phase 2: Shrinking - trapezoid collapses with fade over holdDuration
                // Near end STAYS at the position it was when player pressed (shows press timing)
                // Far end moves from vanishing point toward the near end
                const shrinkProgress = Math.min(holdProgress - 1.0, 1.0); // 0 to 1.0 during phase 2
                
                // Calculate where the near end was at moment of press
                // Only valid if press was within the activation window (±300ms from note.time)
                // If press was too late, cap at judgement line
                const timeUntilHitAtPress = note.time - pressTime;
                const holdProgressAtPress = (LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME;
                
                // Lock near end to position at moment of press
                // If press was too late (negative timeUntilHitAtPress), this caps at 1.0 (judgement line)
                // If press was too early, this stays below 1.0 (early position)
                nearDistance = 1 + (Math.min(Math.max(holdProgressAtPress, 0), 1.0) * (JUDGEMENT_RADIUS - 1));
                
                // Far end moves from vanishing point (1) toward the locked near end
                farDistance = 1 + (shrinkProgress * (nearDistance - 1));
              }
              
              // Glow when key is held OR after successful release (while animating)
              const hasActivePress = pressTime > 0 || note.hit;
              
              // Glow intensity scales with how close to judgement line (capped at Phase 1)
              const glowScale = hasActivePress ? 0.2 + (Math.min(holdProgress, 1.0) * 0.8) : 0.05;
              
              // Phase 2 intensity: decrease glow as trapezoid collapses
              const phase2Progress = Math.max(0, holdProgress - 1.0) / 1.0; // 0 to 1 during Phase 2
              const phase2Glow = phase2Progress > 0 ? (1 - phase2Progress) * 0.8 : 0;
              const finalGlowScale = hasActivePress ? Math.max(glowScale - phase2Glow, 0.1) : 0.05;
              
              // Calculate trapezoid corners using helper function
              const { x1, y1, x2, y2, x3, y3, x4, y4 } = getTrapezoidCorners(
                rayAngle,
                nearDistance,
                farDistance,
                VANISHING_POINT_X,
                VANISHING_POINT_Y
              );
              
              // Phase 1: Opacity increases; Phase 2: Stays visible with gentle fade
              let opacity = 0.4 + Math.min(holdProgress, 1.0) * 0.6;
              if (isInPhase2) {
                const shrinkProgress = Math.min(holdProgress - 1.0, 1.0);
                // During Phase 2, keep opacity high (fade only at the very end)
                opacity = Math.max(0.7 - (shrinkProgress * 0.5), 0.2); // Visible during Phase 2
              }
              // Greyscale notes use fixed grey colors, never affected by health-based color shift
              const baseColor = getColorForLane(note.lane);
              
              // For hold notes, use OPAQUE colors with full saturation - not affected by health effects
              let fillColor: string;
              let glowColor: string;
              
              if (isGreyed) {
                fillColor = 'rgba(80, 80, 80, 0.8)';
                glowColor = 'rgba(100, 100, 100, 0.4)';
              } else {
                // Use bright, fully opaque colors for each deck lane
                if (note.lane === -1) {
                  fillColor = 'rgb(0, 255, 0)'; // Q - green, fully opaque
                  glowColor = 'rgb(0, 255, 0)';
                } else if (note.lane === -2) {
                  fillColor = 'rgb(255, 0, 0)'; // P - red, fully opaque
                  glowColor = 'rgb(255, 0, 0)';
                } else {
                  fillColor = baseColor;
                  glowColor = baseColor;
                }
              }
              
              const strokeColor = isGreyed ? 'rgba(120, 120, 120, 1)' : 'rgba(255,255,255,1)';
              const strokeWidth = 2 + (Math.min(holdProgress, 1.0) * 2); // Stroke grows with trapezoid
              
              return (
                <polygon
                  key={note.id}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill={fillColor}
                  opacity={opacity}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{
                    filter: isGreyed 
                      ? 'drop-shadow(0 0 8px rgba(100,100,100,0.6)) grayscale(1)'
                      : `drop-shadow(0 0 ${Math.max(20, 25 * finalGlowScale)}px ${glowColor}) drop-shadow(0 0 ${Math.max(12, 15 * finalGlowScale)}px ${glowColor})`,
                    transition: 'all 0.05s linear',
                    mixBlendMode: 'screen',
                  }}
                />
              );
              } catch (error) {
                console.warn(`Trapezoid rendering error: ${error}`);
                return null;
              }
            })}

          {/* Judgement lines for hold notes */}
          {[
            { angle: 180, color: '#00FF00' },   // Q - left deck, green
            { angle: 0, color: '#FF0000' },     // P - right deck, red
          ].map((lane, idx) => {
            const rad = (lane.angle * Math.PI) / 180;
            const radius = 187;
            const lineLength = 45;
            
            // Point on the ray at the radius
            const cx = VANISHING_POINT_X + Math.cos(rad) * radius;
            const cy = VANISHING_POINT_Y + Math.sin(rad) * radius;
            
            // Perpendicular direction (rotate 90 degrees)
            const perpRad = rad + Math.PI / 2;
            const x1 = cx + Math.cos(perpRad) * (lineLength / 2);
            const y1 = cy + Math.sin(perpRad) * (lineLength / 2);
            const x2 = cx - Math.cos(perpRad) * (lineLength / 2);
            const y2 = cy - Math.sin(perpRad) * (lineLength / 2);
            
            return (
              <line
                key={`hold-judgement-line-${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={lane.color}
                strokeWidth="3"
                opacity="1"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Notes falling through tunnel - following ray paths */}
        <AnimatePresence>
          {visibleNotes
            .filter(n => n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')
            .map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000);
            
            const rayAngle = getLaneAngle(note.lane);
            const rad = (rayAngle * Math.PI) / 180;
            
            const JUDGEMENT_RADIUS = 187;
            const distance = 1 + (progress * (JUDGEMENT_RADIUS - 1));
            const xOffset = Math.cos(rad) * distance;
            const yOffset = Math.sin(rad) * distance;
            
            const xPosition = VANISHING_POINT_X + xOffset;
            const yPosition = VANISHING_POINT_Y + yOffset;
            const scale = 0.12 + (progress * 0.88);
            
            // Failed tap note - greyscale like failed hold notes
            const isFailed = note.tapMissFailure || false;
            const failureTime = note.failureTime;
            if (isFailed && !failureTime) {
              console.warn(`TAP failure missing failureTime: ${note.id}`);
              return null; // Safety: skip if malformed
            }
            const timeSinceFail = failureTime ? Math.max(0, currentTime - failureTime) : 0;
            // Fade over 1000ms to match HOLD failure animations (consistent visual language)
            const failProgress = Math.min(timeSinceFail / 1000, 1.0); // 0 to 1 over 1000ms fade
            // Hide after 1100ms (animation + buffer) to match HOLD failures
            if (timeSinceFail > 1100) return null;

            return (
              <motion.div
                key={note.id}
                className="absolute w-14 h-14 rounded-lg flex items-center justify-center text-black font-bold text-sm font-rajdhani pointer-events-none"
                style={{
                  backgroundColor: isFailed ? 'rgba(80,80,80,0.6)' : getColorForLane(note.lane),
                  boxShadow: isFailed 
                    ? `0 0 ${6 * scale}px rgba(100,0,0,0.4)` 
                    : `0 0 ${30 * scale}px ${getColorForLane(note.lane)}, inset 0 0 ${18 * scale}px rgba(255,255,255,0.4)`,
                  left: `${xPosition}px`,
                  top: `${yPosition}px`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity: isFailed ? (1 - failProgress) * 0.6 : (0.15 + progress * 0.85),
                  zIndex: Math.floor(progress * 1000),
                  border: `2px solid rgba(100,100,100,${isFailed ? (1-failProgress) * 0.6 : 0.4 * progress})`,
                  filter: isFailed ? 'grayscale(1) brightness(0.5)' : 'none',
                }}
              >
                {getNoteKey(note.lane)}
              </motion.div>
            );
          })}
        </AnimatePresence>

      </div>
    </div>
  );
}
