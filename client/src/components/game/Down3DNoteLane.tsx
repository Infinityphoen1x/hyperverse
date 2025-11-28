import { motion } from "framer-motion";
import { Note, GameErrors, getReleaseTime } from "@/lib/gameEngine";
import { useEffect } from "react";
import { 
  BUTTON_CONFIG, 
  VANISHING_POINT_X, 
  VANISHING_POINT_Y,
  HOLD_NOTE_STRIP_WIDTH_MULTIPLIER,
  FAILURE_ANIMATION_DURATION,
  LEAD_TIME,
  JUDGEMENT_RADIUS,
  HOLD_ANIMATION_DURATION,
  HEXAGON_RADII,
  RAY_ANGLES,
  TUNNEL_MAX_DISTANCE,
  MAX_HEALTH,
  TAP_RENDER_WINDOW_MS,
  TAP_FALLTHROUGH_WINDOW_MS,
  TAP_JUDGEMENT_LINE_WIDTH,
  HOLD_JUDGEMENT_LINE_WIDTH,
  TUNNEL_CONTAINER_WIDTH,
  TUNNEL_CONTAINER_HEIGHT,
  GREYSCALE_FILL_COLOR,
  GREYSCALE_GLOW_COLOR,
  COLOR_DECK_LEFT,
  COLOR_DECK_RIGHT,
} from "@/lib/gameConstants";

// Extract health-based color calculation for tunnel effects
const getHealthBasedRayColor = (health: number): string => {
  const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH; // 0 at full health, 1 at 0 health
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
  vanishingPointY: number,
  noteId?: string
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number; x4: number; y4: number } | null => {
  const leftRayAngle = rayAngle - 15;
  const rightRayAngle = rayAngle + 15;
  const leftRad = (leftRayAngle * Math.PI) / 180;
  const rightRad = (rightRayAngle * Math.PI) / 180;
  
  const corners = {
    x1: vanishingPointX + Math.cos(leftRad) * farDistance,
    y1: vanishingPointY + Math.sin(leftRad) * farDistance,
    x2: vanishingPointX + Math.cos(rightRad) * farDistance,
    y2: vanishingPointY + Math.sin(rightRad) * farDistance,
    x3: vanishingPointX + Math.cos(rightRad) * nearDistance,
    y3: vanishingPointY + Math.sin(rightRad) * nearDistance,
    x4: vanishingPointX + Math.cos(leftRad) * nearDistance,
    y4: vanishingPointY + Math.sin(leftRad) * nearDistance,
  };
  
  // Validate all coordinates are finite
  const allFinite = Object.values(corners).every(v => Number.isFinite(v));
  if (!allFinite) {
    if (noteId) {
      GameErrors.log(`getTrapezoidCorners: Invalid coordinates for note ${noteId}: ${JSON.stringify(corners)}`);
    }
    return null;
  }
  
  return corners;
};

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
  health?: number;
  onPadHit?: (lane: number) => void;
}

export function Down3DNoteLane({ notes, currentTime, health = MAX_HEALTH, onPadHit }: Down3DNoteLaneProps) {
  // Keyboard controls for soundpad buttons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const config = BUTTON_CONFIG.find(c => c.key.toLowerCase() === key);
      if (config && onPadHit) {
        onPadHit(config.lane);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPadHit]);

  // Build RENDER LIST - purely time-based window for drawing notes
  // Separate from game state tracking - render list includes notes that need visual feedback
  // TAP notes: appear TAP_RENDER_WINDOW_MS before hit, show glitch TAP_FALLTHROUGH_WINDOW_MS after miss, then disappear
  // SPIN (hold) notes: appear LEAD_TIME before, visible through animations
  // CRITICAL: Only show ONE hold note per lane at a time (prevent double-up when both fail)
  const visibleNotes = Array.isArray(notes) ? (() => {
    const result: typeof notes = [];
    const holdNotesByLane: Record<number, typeof notes[0] | null> = { [-1]: null, [-2]: null };
    
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      try {
        if (!n || !Number.isFinite(n.time) || !Number.isFinite(currentTime)) {
          if (n && !Number.isFinite(n.time)) {
            GameErrors.log(`Down3DNoteLane: Note ${i} has invalid time ${n.time}`);
          }
          continue; // Skip invalid notes
        }
        
        const timeUntilHit = n.time - currentTime;
        
        if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
          // HOLD NOTE RENDER WINDOW: Determine time-based visibility (independent of game state)
          // Start: LEAD_TIME ms before note.time
          // End: varies based on what happens to the note
          let visibilityEnd = -TAP_RENDER_WINDOW_MS; // Default: TAP_RENDER_WINDOW_MS ms after note.time
          
          // If failed, extend to show HOLD_ANIMATION_DURATION failure animation from failureTime
          if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
            const failureTime = n.failureTime || currentTime;
            const timeSinceNoteTime = failureTime - n.time;
            visibilityEnd = -(timeSinceNoteTime + HOLD_ANIMATION_DURATION);
            
            if (!Number.isFinite(visibilityEnd)) {
              GameErrors.log(`Down3DNoteLane: Invalid visibilityEnd for failed note ${n.id}: failureTime=${failureTime}, noteTime=${n.time}`);
            }
          }
          
          // If pressed/hit, extend to show full hold duration + HOLD_ANIMATION_DURATION Phase 2 shrinking
          else if (n.pressTime && n.pressTime > 0) {
            const holdDuration = n.duration || 1000;
            const holdEndTime = n.pressTime + holdDuration;
            const animationEnd = holdEndTime + HOLD_ANIMATION_DURATION; // Phase 2 shrinking
            visibilityEnd = -(animationEnd - n.time);
          }
          
          // Visibility window: TAP_RENDER_WINDOW_MS before LEAD_TIME to end time (based on note outcome)
          if (timeUntilHit >= visibilityEnd && timeUntilHit <= LEAD_TIME) {
            // Track which hold note to show for this lane (prioritize oldest/earliest)
            if (!holdNotesByLane[n.lane] || (n.time < (holdNotesByLane[n.lane]?.time || Infinity))) {
              holdNotesByLane[n.lane] = n;
            }
          }
        } else {
          // TAP NOTE RENDER WINDOW: Time-based only, no game state filtering
          // Start: TAP_RENDER_WINDOW_MS before note.time
          // End: HOLD_ANIMATION_DURATION after failure, or TAP_FALLTHROUGH_WINDOW_MS after miss/glitch
          
          // If failed, show for HOLD_ANIMATION_DURATION ms from failureTime
          if (n.tapMissFailure) {
            const failureTime = n.failureTime || currentTime;
            const timeSinceFail = currentTime - failureTime;
            if (timeSinceFail >= 0 && timeSinceFail <= HOLD_ANIMATION_DURATION) {
              result.push(n);
            }
            continue;
          }
          
          // Otherwise: show TAP_RENDER_WINDOW_MS before to TAP_FALLTHROUGH_WINDOW_MS after miss window
          // Note: Show in render list even if hit - let rendering logic decide what to draw
          if (timeUntilHit <= TAP_RENDER_WINDOW_MS && timeUntilHit >= -TAP_FALLTHROUGH_WINDOW_MS) {
            result.push(n);
          }
        }
      } catch (error) {
        GameErrors.log(`Down3DNoteLane: Visibility filter error for note ${i}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
    
    // Add only the prioritized hold note per lane to render list
    if (holdNotesByLane[-1]) result.push(holdNotesByLane[-1]!);
    if (holdNotesByLane[-2]) result.push(holdNotesByLane[-2]!);
    
    return result;
  })() : [];

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
    
    // Shift towards red (#FF0000) as health decreases (0-MAX_HEALTH range)
    const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH; // 0 at full health, 1 at 0 health
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
  const allRayAngles = RAY_ANGLES;

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
      GameErrors.log(`Down3DNoteLane: Invalid lane ${lane}, using default angle 0`);
      return 0; // Fallback to 0 degrees
    }
    return angle;
  };

  const MAX_DISTANCE = TUNNEL_MAX_DISTANCE;

  // 6 soundpad buttons positioned at tunnel lanes
  const soundpadButtons = BUTTON_CONFIG.map(({ lane, key, angle, color }) => {
    const rad = (angle * Math.PI) / 180;
    const xPosition = VANISHING_POINT_X + Math.cos(rad) * MAX_DISTANCE;
    const yPosition = VANISHING_POINT_Y + Math.sin(rad) * MAX_DISTANCE;
    return { lane, key, angle, color, xPosition, yPosition };
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Star tunnel container - centered */}
      <div 
        className="relative"
        style={{
          width: `${TUNNEL_CONTAINER_WIDTH}px`,
          height: `${TUNNEL_CONTAINER_HEIGHT}px`,
          margin: '0 auto',
        }}
      >
        {/* SVG for tunnel with concentric circles and variable-width lines */}
        <svg 
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 1 }}
        >
          {/* Concentric hexagons - faint tunnel walls with variable thickness */}
          {HEXAGON_RADII.map((radius, idx) => {
            const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
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
            const radius = JUDGEMENT_RADIUS;
            const lineLength = TAP_JUDGEMENT_LINE_WIDTH;
            
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
                
                if (!Number.isFinite(timeUntilHit) || !Number.isFinite(LEAD_TIME)) {
                  return null; // Skip if calculations would be invalid
                }
                
                const pressTime = note.pressTime || 0;
                const holdDuration = note.duration || 1000; // Use beatmap duration, fallback to 1000ms
                const isTooEarlyFailure = note.tooEarlyFailure || false;
                const isHoldReleaseFailure = note.holdReleaseFailure || false;
                const isHoldMissFailure = note.holdMissFailure || false;
                
                // Determine if note is greyed out (failed) - will be calculated after approachProgress
                let isGreyed = false;
                let failureTime = note.failureTime || currentTime;
                
                if (isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure) {
                  // Skip rendering if failure animation is complete
                  const timeSinceFail = Math.max(0, currentTime - failureTime);
                  if (timeSinceFail > HOLD_ANIMATION_DURATION) {
                    // Mark animations as completed only when animation duration is finished
                    const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
                    if (isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
                    if (isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
                    if (isHoldMissFailure) failureTypes.push('holdMissFailure');
                    
                    for (const failureType of failureTypes) {
                      const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
                      if (animEntry && animEntry.status !== 'completed') {
                        GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
                      }
                    }
                    return null;
                  }
                }
              
              // Get ray angle
              const rayAngle = getLaneAngle(note.lane);
              if (!Number.isFinite(rayAngle)) {
                console.warn(`Invalid ray angle for lane ${note.lane}`);
                return null;
              }
              
              // Unified geometry: approach phase then collapse phase
              // APPROACH: Near end grows from vanishing point (1) toward judgement line (187)
              // COLLAPSE: After player presses, near end locks and far end moves toward it
              
              let nearDistance, farDistance;
              let lockedNearDistance: number | null = null;
              let collapseProgress = 0; // Initialize here to avoid temporal dead zone
              
              // APPROACH PHASE: Hold note is a flat rectangular strip moving toward camera
              // Before press: both near and far move together, maintaining constant Z-length (strip width)
              // Once past judgement: continue progressing (note moves past camera) unless clamped by press
              const rawApproachProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
              
              // Determine if approach progress should clamp at judgement line
              // Clamp for successful/failed presses (not too-early failures)
              // Allow unclamped for unpressed misses (pass through judgement line like TAP notes)
              const isSuccessfulPress = pressTime > 0 && !isTooEarlyFailure;
              const approachProgress = isSuccessfulPress ? Math.min(rawApproachProgress, 1.0) : rawApproachProgress;
              const approachNearDistance = Math.max(1, 1 + (approachProgress * (JUDGEMENT_RADIUS - 1)));
              
              // Strip width = fixed depth length based on duration
              const stripWidth = (note.duration || 1000) * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
              const approachFarDistance = Math.max(1, approachNearDistance - stripWidth);
              
              // Determine greyscale state based on failure type and timing
              if (isTooEarlyFailure && pressTime > 0) {
                // tooEarlyFailure: turns greyscale instantly when pressed
                isGreyed = true;
              } else if (isHoldMissFailure && approachNearDistance >= JUDGEMENT_RADIUS) {
                // holdMissFailure: turns greyscale when it passes judgement line
                isGreyed = true;
              } else if (isHoldReleaseFailure) {
                // holdReleaseFailure: turns greyscale (all failures must greyscale)
                isGreyed = true;
              }
              
              // Determine collapse timing for ALL cases (needed before geometry calculations)
              let collapseDuration = holdDuration;
              if (isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure) {
                // All failures use full animation duration for consistent visual timing
                collapseDuration = FAILURE_ANIMATION_DURATION;
              }
              
              // COLLAPSE PHASE: Hold note consumption mechanic
              // When you press and hold a note, it "consumes" - near end locks and far end contracts to it
              if (note.tooEarlyFailure && pressTime && pressTime > 0) {
                // tooEarlyFailure: Just use approach geometry and fade, don't collapse
                nearDistance = approachNearDistance;
                farDistance = approachFarDistance;
              } else if (pressTime && pressTime > 0) {
                // Pressed note: Consume mechanic - lock near end, contract far end toward it
                if (note.hit) {
                  // Successful hit (on-time release): lock near end at judgement line
                  // This represents the note being "consumed" at the hit zone
                  lockedNearDistance = JUDGEMENT_RADIUS;
                } else {
                  // Early-but-valid press: lock near end at the position where it was pressed
                  // This represents "grabbing" the note before it reaches judgement line
                  const timeUntilHitAtPress = note.time - pressTime;
                  const pressApproachProgress = Math.max((LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME, 0);
                  // Clamp at judgement line - near end never goes past it
                  lockedNearDistance = Math.min(JUDGEMENT_RADIUS, 1 + (pressApproachProgress * (JUDGEMENT_RADIUS - 1)));
                }
                
                // Far end at press time: maintains strip width before press
                const farDistanceAtPress = Math.max(1, lockedNearDistance - stripWidth);
                
                const timeSincePress = currentTime - pressTime;
                collapseProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
                
                // During collapse: near end locked, far end contracts toward near end
                nearDistance = lockedNearDistance;
                farDistance = farDistanceAtPress * (1 - collapseProgress) + lockedNearDistance * collapseProgress;
              } else {
                // No press yet OR unpressed holdMissFailure: use approach phase geometry
                nearDistance = approachNearDistance;
                farDistance = approachFarDistance;
              }
              
              // Glow when key is held OR after successful release (while animating)
              const hasActivePress = pressTime > 0 || note.hit;
              
              // Glow intensity scales with approach progress
              const glowScale = hasActivePress ? 0.2 + (Math.min(approachProgress, 1.0) * 0.8) : 0.05;
              
              // During collapse: decrease glow as trapezoid collapses
              let collapseGlowProgress = 0;
              if (pressTime && pressTime > 0) {
                const timeSincePress = currentTime - pressTime;
                collapseGlowProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
              }
              const collapseGlow = collapseGlowProgress > 0 ? (1 - collapseGlowProgress) * 0.8 : 0;
              const finalGlowScale = hasActivePress ? Math.max(glowScale - collapseGlow, 0.1) : 0.05;
              
              // Calculate trapezoid corners using helper function
              const corners = getTrapezoidCorners(
                rayAngle,
                nearDistance,
                farDistance,
                VANISHING_POINT_X,
                VANISHING_POINT_Y,
                note.id
              );
              
              if (!corners) {
                if (note.tooEarlyFailure || note.holdReleaseFailure || note.holdMissFailure) {
                  GameErrors.updateAnimation(note.id, { status: 'failed', errorMsg: 'Invalid trapezoid geometry' });
                }
                return null;
              }
              
              const { x1, y1, x2, y2, x3, y3, x4, y4 } = corners;
              
              // Calculate opacity and collapse progress based on note state
              let opacity = 0.4 + Math.min(approachProgress, 1.0) * 0.6; // Default: fade in during approach
              
              // Track hold note animation lifecycle - handle all failure types
              // Build list of active failure types for this note
              const activeFailureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
              if (isTooEarlyFailure) activeFailureTypes.push('tooEarlyFailure');
              if (isHoldReleaseFailure) activeFailureTypes.push('holdReleaseFailure');
              if (isHoldMissFailure) activeFailureTypes.push('holdMissFailure');
              
              if (activeFailureTypes.length > 0) {
                // Update all failure types for this note
                for (const failureType of activeFailureTypes) {
                  const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
                  const failureTime = animEntry?.failureTime || note.failureTime || currentTime;
                  const timeSinceFailure = Math.max(0, currentTime - failureTime);
                  
                  if (!animEntry) {
                    // Create tracking entry for this failure type
                    GameErrors.trackAnimation(note.id, failureType, note.failureTime || currentTime);
                  } else if (animEntry.status === 'pending') {
                    // If this animation is old enough to be complete, skip rendering and mark complete
                    if (timeSinceFailure >= HOLD_ANIMATION_DURATION) {
                      GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
                    } else {
                      // Otherwise mark as rendering on first visual frame
                      GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
                    }
                  }
                  
                  // Mark as completed when animation finishes
                  if (collapseProgress >= 0.99 && animEntry && animEntry.status !== 'completed') {
                    GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
                  }
                }
              }
              
              // Handle unpressed failures (no second calculation needed for pressed notes - already done above)
              if (!pressTime || pressTime === 0) {
                if (activeFailureTypes.length > 0) {
                  // Unpressed failure: fade over standard failure duration
                  const failureTime = note.failureTime || currentTime;
                  const timeSinceFailure = Math.max(0, currentTime - failureTime);
                  collapseProgress = Math.min(Math.max(timeSinceFailure / FAILURE_ANIMATION_DURATION, 0), 1.0);
                }
              }
              
              // Apply fade during collapse (pressed or unpressed failure)
              if (collapseProgress > 0) {
                opacity = Math.max(1.0 - collapseProgress, 0.0);
              }
              
              const strokeWidth = 2 + (collapseProgress > 0 ? (1 - collapseProgress) * 2 : approachProgress * 2);
              // Greyscale notes use fixed grey colors, never affected by health-based color shift
              const baseColor = getColorForLane(note.lane);
              
              // For hold notes, use OPAQUE colors with full saturation - not affected by health effects
              let fillColor: string;
              let glowColor: string;
              
              if (isGreyed) {
                fillColor = GREYSCALE_FILL_COLOR;
                glowColor = GREYSCALE_GLOW_COLOR;
              } else {
                // Use bright, fully opaque colors for each deck lane
                if (note.lane === -1) {
                  fillColor = COLOR_DECK_LEFT; // Q - green, fully opaque
                  glowColor = COLOR_DECK_LEFT;
                } else if (note.lane === -2) {
                  fillColor = COLOR_DECK_RIGHT; // P - red, fully opaque
                  glowColor = COLOR_DECK_RIGHT;
                } else {
                  fillColor = baseColor;
                  glowColor = baseColor;
                }
              }
              
              const strokeColor = isGreyed ? 'rgba(120, 120, 120, 1)' : 'rgba(255,255,255,1)';
              
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
                      ? `drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)`
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
            { angle: 180, color: COLOR_DECK_LEFT },   // Q - left deck, green
            { angle: 0, color: COLOR_DECK_RIGHT },     // P - right deck, red
          ].map((lane, idx) => {
            const rad = (lane.angle * Math.PI) / 180;
            const radius = JUDGEMENT_RADIUS;
            const lineLength = HOLD_JUDGEMENT_LINE_WIDTH;
            
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

          {/* TAP notes rendered as SVG circles - following ray paths */}
          {visibleNotes
            .filter(n => n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')
            .map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000);
            
            if (progress < 0 || progress > 1.25) return null; // Only render in valid window
            
            const tapRayAngle = getLaneAngle(note.lane);
            
            // Track note state: hit, failed, or approaching
            const isHit = note.hit || false;
            const isFailed = note.tapMissFailure || false;
            const failureTime = note.failureTime;
            
            if (isFailed && !failureTime) {
              GameErrors.log(`Down3DNoteLane: TAP failure missing failureTime: ${note.id}`);
              return null; // Safety: skip if malformed
            }
            const timeSinceFail = failureTime ? Math.max(0, currentTime - failureTime) : 0;
            const timeSinceHit = isHit && note.hitTime ? Math.max(0, currentTime - note.hitTime) : 0;
            
            // Track TAP note animation lifecycle
            if (isFailed) {
              const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === 'tapMissFailure');
              if (!animEntry) {
                // First render of this TAP failure - create tracking entry
                GameErrors.trackAnimation(note.id, 'tapMissFailure', failureTime || currentTime);
              } else if (animEntry.status === 'pending') {
                // If animation is old, jump straight to complete; otherwise mark rendering
                if (timeSinceFail >= 1100) {
                  GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
                  return null; // Animation already finished, don't render
                } else {
                  GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
                }
              } else if (animEntry.status === 'rendering' && timeSinceFail >= 1100) {
                // Mark as completed when animation finishes (BEFORE returning null)
                GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
                return null; // Animation finished, don't render
              }
            }
            
            // Fade over 1000ms to match HOLD failure animations (consistent visual language)
            const failProgress = Math.min(timeSinceFail / 1000, 1.0); // 0 to 1 over 1000ms fade
            // Hide after 1100ms (animation + buffer) to match HOLD failures
            if (timeSinceFail > 1100) {
              // Mark animations as completed before returning (safety check for stuck animations)
              if (isFailed) {
                const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === 'tapMissFailure');
                if (animEntry && animEntry.status !== 'completed') {
                  GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
                }
              }
              return null;
            }
            
            // HIT SUCCESS: Fade on successful hit
            if (isHit && timeSinceHit < 600) {
              // Hit success: trapezoid fades out over 600ms
              // (no special scaling, just uses tapOpacity below)
            } else if (isHit && timeSinceHit >= 600) {
              // Note already finished its hit animation, don't render anymore
              return null;
            }

            const noteColor = getColorForLane(note.lane);
            
            // TAP notes: trapezoid with narrower flanking rays for compact appearance
            // Depth scales with progress: smaller at vanishing point, larger at judgement line
            // This creates the illusion of notes growing as they approach
            const MIN_DEPTH = 5;
            const MAX_DEPTH = 40;
            const TRAPEZOID_DEPTH = MIN_DEPTH + (progress * (MAX_DEPTH - MIN_DEPTH));
            const nearDist = 1 + (progress * (JUDGEMENT_RADIUS - 1)); // Both travel together
            const farDist = Math.max(0.1, nearDist - TRAPEZOID_DEPTH);
            
            // Narrower flanking angles (±8° instead of ±15°) for consistent near-end width
            const tapLeftRayAngle = tapRayAngle - 8;
            const tapRightRayAngle = tapRayAngle + 8;
            const tapLeftRad = (tapLeftRayAngle * Math.PI) / 180;
            const tapRightRad = (tapRightRayAngle * Math.PI) / 180;
            
            // Calculate trapezoid corners with minimal flanking
            const x1 = VANISHING_POINT_X + Math.cos(tapLeftRad) * farDist;
            const y1 = VANISHING_POINT_Y + Math.sin(tapLeftRad) * farDist;
            const x2 = VANISHING_POINT_X + Math.cos(tapRightRad) * farDist;
            const y2 = VANISHING_POINT_Y + Math.sin(tapRightRad) * farDist;
            const x3 = VANISHING_POINT_X + Math.cos(tapRightRad) * nearDist;
            const y3 = VANISHING_POINT_Y + Math.sin(tapRightRad) * nearDist;
            const x4 = VANISHING_POINT_X + Math.cos(tapLeftRad) * nearDist;
            const y4 = VANISHING_POINT_Y + Math.sin(tapLeftRad) * nearDist;
            
            const points = `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
            
            // Opacity: fade in as approaching (0.4 → 1.0)
            let tapOpacity = 0.4 + (progress * 0.6);
            if (isFailed) {
              tapOpacity = (1 - failProgress) * 0.6;
            } else if (isHit) {
              tapOpacity = (1 - (timeSinceHit / 600)) * (0.4 + (progress * 0.6));
            }
            
            const hitFlashIntensity = isHit && timeSinceHit < 600 ? Math.max(0, 1 - (timeSinceHit / 600)) : 0;
            
            return (
              <polygon
                key={note.id}
                points={points}
                fill={isFailed ? 'rgba(80,80,80,0.3)' : noteColor}
                opacity={Math.max(tapOpacity, 0)}
                stroke={isFailed ? 'rgba(100,100,100,0.6)' : 'rgba(255,255,255,0.8)'}
                strokeWidth={1.5}
                style={{
                  filter: isFailed 
                    ? 'drop-shadow(0 0 8px rgba(100,100,100,0.6)) grayscale(1)'
                    : hitFlashIntensity > 0 
                      ? `brightness(1.8) drop-shadow(0 0 20px ${noteColor})`
                      : `drop-shadow(0 0 ${10 * progress}px ${noteColor})`,
                  transition: 'all 0.05s linear',
                  mixBlendMode: 'screen',
                }}
              />
            );
          })}
        </svg>

        {/* 6 Soundpad Buttons as circles - absolutely positioned */}
        {soundpadButtons.map(({ lane, key, color, xPosition, yPosition }) => (
          <motion.button
            key={`pad-${lane}`}
            className="absolute rounded-full font-bold font-rajdhani text-white focus:outline-none pointer-events-auto"
            style={{
              width: '40px',
              height: '40px',
              left: `${xPosition}px`,
              top: `${yPosition}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: color,
              opacity: 0.25,
              border: `2px solid ${color}`,
              boxShadow: `0 0 20px ${color}, 0 0 30px ${color}99`,
              zIndex: 50,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={() => {
              onPadHit?.(lane);
              window.dispatchEvent(new CustomEvent(`pad-hit-${lane}`));
            }}
            data-testid={`pad-button-${lane}`}
          >
            {key}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
