import { motion, AnimatePresence } from "framer-motion";
import { Note, GameErrors, getReleaseTime } from "@/lib/gameEngine";
import { useEffect } from "react";

const BUTTON_CONFIG = [
  { lane: 0, key: 'W', angle: 120, color: '#FF007F' },    // W - top-left pink
  { lane: 1, key: 'O', angle: 60, color: '#0096FF' },     // O - top-right blue
  { lane: 2, key: 'I', angle: 300, color: '#BE00FF' },    // I - bottom-right purple
  { lane: 3, key: 'E', angle: 240, color: '#00FFFF' },    // E - bottom-left cyan
  { lane: -1, key: 'Q', angle: 180, color: '#00FF00' },   // Q - left deck green
  { lane: -2, key: 'P', angle: 0, color: '#FF0000' },     // P - right deck red
];

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

export function Down3DNoteLane({ notes, currentTime, health = 200, onPadHit }: Down3DNoteLaneProps) {
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

  // Build RENDER LIST - purely time-based window for drawing notes
  // Separate from game state tracking - render list includes notes that need visual feedback
  // TAP notes: appear 2000ms before hit, show glitch 500ms after miss, then disappear
  // SPIN (hold) notes: appear 4000ms before, visible through animations
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
          // Start: 4000ms before note.time (LEAD_TIME)
          // End: varies based on what happens to the note
          let visibilityEnd = -2000; // Default: 2000ms after note.time
          
          // If failed, extend to show 1100ms failure animation from failureTime
          if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
            const failureTime = n.failureTime || currentTime;
            const timeSinceNoteTime = failureTime - n.time;
            visibilityEnd = -(timeSinceNoteTime + 1100);
            
            if (!Number.isFinite(visibilityEnd)) {
              GameErrors.log(`Down3DNoteLane: Invalid visibilityEnd for failed note ${n.id}: failureTime=${failureTime}, noteTime=${n.time}`);
            }
          }
          
          // If pressed/hit, extend to show full hold duration + 1100ms Phase 2 shrinking
          else if (n.pressTime && n.pressTime > 0) {
            const holdDuration = n.duration || 1000;
            const holdEndTime = n.pressTime + holdDuration;
            const animationEnd = holdEndTime + 1100; // Phase 2 shrinking
            visibilityEnd = -(animationEnd - n.time);
          }
          
          // Visibility window: 4000ms before to end time (based on note outcome)
          if (timeUntilHit >= visibilityEnd && timeUntilHit <= 4000) {
            // Track which hold note to show for this lane (prioritize oldest/earliest)
            if (!holdNotesByLane[n.lane] || (n.time < (holdNotesByLane[n.lane]?.time || Infinity))) {
              holdNotesByLane[n.lane] = n;
            }
          }
        } else {
          // TAP NOTE RENDER WINDOW: Time-based only, no game state filtering
          // Start: 2000ms before note.time
          // End: 1100ms after failure, or 500ms after miss/glitch
          
          // If failed, show for 1100ms from failureTime
          if (n.tapMissFailure) {
            const failureTime = n.failureTime || currentTime;
            const timeSinceFail = currentTime - failureTime;
            if (timeSinceFail >= 0 && timeSinceFail <= 1100) {
              result.push(n);
            }
            continue;
          }
          
          // Otherwise: show 2000ms before to 500ms after miss window
          // Note: Show in render list even if hit - let rendering logic decide what to draw
          if (timeUntilHit <= 2000 && timeUntilHit >= -500) {
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
      GameErrors.log(`Down3DNoteLane: Invalid lane ${lane}, using default angle 0`);
      return 0; // Fallback to 0 degrees
    }
    return angle;
  };

  const VANISHING_POINT_X = 350;
  const VANISHING_POINT_Y = 200;
  const MAX_DISTANCE = 260;

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
                
                // Determine if note is greyed out (failed)
                let isGreyed = false;
                if (isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure) {
                  isGreyed = true;
                  // Skip rendering if failure animation is complete (>1100ms)
                  const failureTime = note.failureTime || currentTime;
                  const timeSinceShrinkStart = Math.max(0, currentTime - failureTime);
                  if (timeSinceShrinkStart > 1100) return null;
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
              
              // Unified geometry: approach phase then collapse phase
              // APPROACH: Near end grows from vanishing point (1) toward judgement line (187)
              // COLLAPSE: After player presses, near end locks and far end moves toward it
              
              let nearDistance, farDistance;
              let lockedNearDistance: number | null = null;
              
              // APPROACH PHASE: Hold note is a flat rectangular strip moving toward camera
              // Before press: both near and far move together, maintaining constant Z-length (strip width)
              // All notes clamp to 1.0 at judgement line - pressed holds collapse, unpressed just fade out
              const approachProgress = Math.min(timeUntilHit > 0 ? (LEAD_TIME - timeUntilHit) / LEAD_TIME : 1.0, 1.0);
              const approachNearDistance = 1 + (approachProgress * (JUDGEMENT_RADIUS - 1));
              
              // Strip width = fixed depth length based on duration
              const stripWidth = (note.duration || 1000) * 0.15;
              const approachFarDistance = Math.max(1, approachNearDistance - stripWidth);
              
              // COLLAPSE PHASE: After player presses, lock near end and calculate collapse
              if (note.tooEarlyFailure && pressTime && pressTime > 0) {
                // tooEarlyFailure: Lock near end at press position, collapse far end toward it
                const timeUntilHitAtPress = note.time - pressTime;
                const pressApproachProgress = Math.min(Math.max((LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME, 0), 1.0);
                lockedNearDistance = 1 + (pressApproachProgress * (JUDGEMENT_RADIUS - 1));
                
                // Far end at press time: maintains strip width before press
                const farDistanceAtPress = Math.max(1, lockedNearDistance - stripWidth);
                
                const collapseDuration = 1100;
                const timeSincePress = currentTime - pressTime;
                const collapseProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
                
                nearDistance = lockedNearDistance;
                farDistance = farDistanceAtPress * (1 - collapseProgress) + lockedNearDistance * collapseProgress;
              } else if (pressTime && pressTime > 0) {
                // Successful hold OR holdReleaseFailure: Lock near end, collapse far end toward it
                const timeUntilHitAtPress = note.time - pressTime;
                const pressApproachProgress = Math.min(Math.max((LEAD_TIME - timeUntilHitAtPress) / LEAD_TIME, 0), 1.0);
                lockedNearDistance = 1 + (pressApproachProgress * (JUDGEMENT_RADIUS - 1));
                
                // Far end at press time: maintains strip width before press
                const farDistanceAtPress = Math.max(1, lockedNearDistance - stripWidth);
                
                // Determine collapse duration based on fail state (MUST MATCH OPACITY TIMING)
                let actualReleaseTime = getReleaseTime(note.id);
                let collapseDuration = holdDuration;
                
                if (note.holdReleaseFailure && actualReleaseTime) {
                  collapseDuration = Math.max(1, actualReleaseTime - pressTime);
                }
                
                const timeSincePress = currentTime - pressTime;
                const collapseProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
                
                // During collapse: near end locked, far end moves toward near end
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
                const holdEndTime = note.time + holdDuration;
                const collapseDuration = holdEndTime - pressTime;
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
              
              // Track hold note animation lifecycle - handle all failure types
              if (note.tooEarlyFailure || note.holdReleaseFailure || note.holdMissFailure) {
                const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
                if (note.tooEarlyFailure) failureTypes.push('tooEarlyFailure');
                if (note.holdReleaseFailure) failureTypes.push('holdReleaseFailure');
                if (note.holdMissFailure) failureTypes.push('holdMissFailure');
                
                // Update all failure types for this note
                for (const failureType of failureTypes) {
                  const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
                  const failureTime = animEntry?.failureTime || note.failureTime || currentTime;
                  const timeSinceFailure = Math.max(0, currentTime - failureTime);
                  
                  if (!animEntry) {
                    // Create tracking entry for this failure type
                    GameErrors.trackAnimation(note.id, failureType, note.failureTime || currentTime);
                  } else if (animEntry.status === 'pending') {
                    // If this animation is old enough to be complete, skip rendering and mark complete
                    if (timeSinceFailure >= 1100) {
                      GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
                    } else {
                      // Otherwise mark as rendering on first visual frame
                      GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
                    }
                  }
                }
              }
              
              // Opacity: increases during approach, fades during collapse
              let opacity = 0.4 + Math.min(approachProgress, 1.0) * 0.6;
              let collapseProgress = 0;
              
              // During collapse: fade from 1.0 to 0.2
              if (pressTime && pressTime > 0) {
                // Use same collapse timing as geometry
                let actualReleaseTime = getReleaseTime(note.id);
                let collapseEndTime = note.time + holdDuration;
                let collapseDuration = holdDuration;
                
                if (note.holdReleaseFailure && actualReleaseTime) {
                  collapseEndTime = actualReleaseTime;
                  collapseDuration = Math.max(1, collapseEndTime - pressTime);
                } else if (note.tooEarlyFailure) {
                  // tooEarlyFailure: give full 1100ms for animation to complete
                  collapseDuration = 1100;
                  collapseEndTime = pressTime + 1100;
                } else if (note.holdMissFailure) {
                  collapseDuration = holdDuration;
                  collapseEndTime = note.time + holdDuration;
                }
                
                const timeSincePress = currentTime - pressTime;
                collapseProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
                
                opacity = Math.max(1.0 - (collapseProgress * 0.8), 0.2); // Smooth fade from 1.0 to 0.2
                
                // Mark animations as completed when collapse finishes
                if (collapseProgress >= 0.99 && (note.tooEarlyFailure || note.holdReleaseFailure || note.holdMissFailure)) {
                  const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
                  if (note.tooEarlyFailure) failureTypes.push('tooEarlyFailure');
                  if (note.holdReleaseFailure) failureTypes.push('holdReleaseFailure');
                  if (note.holdMissFailure) failureTypes.push('holdMissFailure');
                  
                  // Mark all failure types as completed
                  for (const failureType of failureTypes) {
                    const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
                    if (animEntry && animEntry.status !== 'completed') {
                      GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
                    }
                  }
                }
              } else if (isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure) {
                // Unpressed failure (never pressed): collapse from judgement line over 1100ms
                const failureTime = note.failureTime || currentTime;
                const collapseDuration = 1100;
                const timeSinceFailure = Math.max(0, currentTime - failureTime);
                collapseProgress = Math.min(Math.max(timeSinceFailure / collapseDuration, 0), 1.0);
                
                opacity = Math.max(1.0 - (collapseProgress * 0.8), 0.2);
              }
              
              const strokeWidth = 2 + (collapseProgress > 0 ? (1 - collapseProgress) * 2 : approachProgress * 2);
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
            const JUDGEMENT_RADIUS = 187;
            
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
