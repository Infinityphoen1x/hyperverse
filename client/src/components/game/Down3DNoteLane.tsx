import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { useEffect, useState, useRef } from "react";
import { 
  BUTTON_CONFIG, 
  VANISHING_POINT_X, 
  VANISHING_POINT_Y,
  ANGLE_SHIFT_DISTANCE,
  ANGLE_SHIFT_DURATION,
  HOLD_NOTE_STRIP_WIDTH_MULTIPLIER,
  FAILURE_ANIMATION_DURATION,
  LEAD_TIME,
  JUDGEMENT_RADIUS,
  HOLD_ANIMATION_DURATION,
  HEXAGON_RADII,
  RAY_ANGLES,
  TUNNEL_MAX_DISTANCE,
  MAX_HEALTH,
  HOLD_RENDER_WINDOW_MS,
  TAP_JUDGEMENT_LINE_WIDTH,
  HOLD_JUDGEMENT_LINE_WIDTH,
  TUNNEL_CONTAINER_WIDTH,
  TUNNEL_CONTAINER_HEIGHT,
  GREYSCALE_GLOW_COLOR,
  COLOR_DECK_LEFT,
  COLOR_DECK_RIGHT,
} from '@/lib/utils/gameConstants';
import {
  markAnimationCompletedIfDone,
  calculateApproachGeometry,
  getTapNoteState,
  shouldRenderTapNote,
  trackTapNoteAnimation,
  calculateTapNoteGeometry,
  calculateTapNoteStyle,
  calculateCollapseGeometry,
  calculateLockedNearDistance,
  calculateHoldNoteGlow,
  calculateHoldNoteColors,
  trackHoldNoteAnimationLifecycle,
  getHoldNoteFailureStates,
  determineGreyscaleState,
  getTrapezoidCorners,
} from "@/lib/noteHelpers";

// Tunnel-specific: health-based ray color gradient
const getHealthBasedRayColor = (health: number): string => {
  const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH;
  const r = Math.round(0 + (255 - 0) * healthFactor);
  const g = Math.round(255 * (1 - healthFactor));
  const b = Math.round(255 * (1 - healthFactor));
  return `rgba(${r},${g},${b},1)`;
};

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
  health?: number;
  combo?: number;
  onPadHit?: (lane: number) => void;
  onDeckHoldStart?: (lane: number) => void;
  onDeckHoldEnd?: (lane: number) => void;
}

export function Down3DNoteLane({ notes, currentTime, health = MAX_HEALTH, combo = 0, onPadHit, onDeckHoldStart, onDeckHoldEnd }: Down3DNoteLaneProps) {
  // Dynamic vanishing point offset - shifts at combo milestones
  const [vpOffset, setVpOffset] = useState({ x: 0, y: 0 });
  const prevComboMilestoneRef = useRef<number>(0);
  const animationStartRef = useRef<number>(Date.now() + ANGLE_SHIFT_DURATION); // Initialize far future so animation doesn't run until triggered
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  const vanishingPointShiftsRef = useRef<Array<{ milestone: number; fromOffset: { x: number; y: number }; toOffset: { x: number; y: number }; distance: number }>>([]);
  
  // Error tracking for vanishing point shifts
  const validateVanishingPointShift = (milestone: number, prevOffset: { x: number; y: number }, newOffset: { x: number; y: number }) => {
    const distance = Math.sqrt(Math.pow(newOffset.x - prevOffset.x, 2) + Math.pow(newOffset.y - prevOffset.y, 2));
    const expectedDistance = ANGLE_SHIFT_DISTANCE;
    const tolerance = 0.5; // Allow ±0.5px tolerance
    
    const shiftRecord = {
      milestone,
      fromOffset: { ...prevOffset },
      toOffset: { ...newOffset },
      distance
    };
    
    // Add to tracking
    vanishingPointShiftsRef.current.push(shiftRecord);
    
    // Validate shift distance
    if (Math.abs(distance - expectedDistance) > tolerance) {
      console.warn(`[VP-ERROR] Milestone ${milestone}x: Shift distance ${distance.toFixed(2)}px exceeds expected ${expectedDistance}px`, shiftRecord);
    } else {
      console.log(`[VP-OK] Milestone ${milestone}x: Offset shifted by ${distance.toFixed(2)}px from [${prevOffset.x.toFixed(1)}, ${prevOffset.y.toFixed(1)}] to [${newOffset.x.toFixed(1)}, ${newOffset.y.toFixed(1)}]`);
    }
    
    return shiftRecord;
  };
  
  // Smooth animation loop for vanishing point offset
  useEffect(() => {
    let animationFrameId: number;
    let lastAnimatedValues = { x: 0, y: 0 };
    let completionLogged = false;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - animationStartRef.current;
      
      if (elapsed < ANGLE_SHIFT_DURATION) {
        const progress = Math.min(elapsed / ANGLE_SHIFT_DURATION, 1);
        // Smooth easing: ease-out (deceleration)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const newX = currentOffsetRef.current.x + (targetOffsetRef.current.x - currentOffsetRef.current.x) * easeProgress;
        const newY = currentOffsetRef.current.y + (targetOffsetRef.current.y - currentOffsetRef.current.y) * easeProgress;
        
        lastAnimatedValues = { x: newX, y: newY };
        setVpOffset({ x: newX, y: newY });
        completionLogged = false;
      } else if (!completionLogged) {
        // Animation complete - snap to target and preserve for next milestone
        completionLogged = true;
        lastAnimatedValues = { ...targetOffsetRef.current };
        currentOffsetRef.current = { ...targetOffsetRef.current };
        console.log(`[VP-ANIM] Animation complete: currentRef now set to [${targetOffsetRef.current.x.toFixed(1)}, ${targetOffsetRef.current.y.toFixed(1)}]`);
        setVpOffset({ x: targetOffsetRef.current.x, y: targetOffsetRef.current.y });
      }
      
      // Always continue animation loop
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  
  // Detect combo milestones (10, 20, 30, etc.) - shift vanishing point to new angle, reset on x50
  useEffect(() => {
    const currentMilestone = Math.floor(combo / 10) * 10;
    if (combo > 0 && currentMilestone !== prevComboMilestoneRef.current) {
      prevComboMilestoneRef.current = currentMilestone;
      
      // Check if this is a x50 milestone - reset to center
      if (currentMilestone % 50 === 0) {
        const currentAnimOffset = currentOffsetRef.current;
        const returnDistance = Math.sqrt(Math.pow(currentAnimOffset.x, 2) + Math.pow(currentAnimOffset.y, 2));
        console.log(`[VP-RESET] x50 milestone: Returning to center from [${currentAnimOffset.x.toFixed(1)}, ${currentAnimOffset.y.toFixed(1)}] (distance: ${returnDistance.toFixed(2)}px)`);
        
        // Smooth return to center on x50
        animationStartRef.current = Date.now();
        currentOffsetRef.current = { ...currentAnimOffset };
        targetOffsetRef.current = { x: 0, y: 0 };
      } else {
        // Non-x50 milestones: smoothly shift to NEW random angle - STAYS OFFSET (viewing angle shift)
        const angle = Math.random() * Math.PI * 2;
        const newOffsetX = Math.cos(angle) * ANGLE_SHIFT_DISTANCE;
        const newOffsetY = Math.sin(angle) * ANGLE_SHIFT_DISTANCE;
        
        // Use current animated offset, not state (state lags behind animation)
        const currentAnimOffset = currentOffsetRef.current;
        
        // Validate the shift before applying
        validateVanishingPointShift(currentMilestone, currentAnimOffset, { x: newOffsetX, y: newOffsetY });
        
        // Start smooth transition from current animation frame to new angle
        animationStartRef.current = Date.now();
        currentOffsetRef.current = { ...currentAnimOffset };
        targetOffsetRef.current = { x: newOffsetX, y: newOffsetY };
        // NO RETURN TO CENTER - stays at new offset for immersive "tunnel angle" effect
      }
    }
  }, [combo]);

  
  // Dynamic vanishing point for perspective calculation (affects ray angles)
  const vpX = VANISHING_POINT_X + vpOffset.x;
  const vpY = VANISHING_POINT_Y + vpOffset.y;
  
  // Fixed hexagon center (doesn't move, stays at default vanishing point)
  const hexCenterX = VANISHING_POINT_X;
  const hexCenterY = VANISHING_POINT_Y;
  
  // Debug logging
  useEffect(() => {
    if (combo > 0 && combo % 5 === 0) {
      console.log(`[VP-RENDER] Combo ${combo}: vpOffset=[${vpOffset.x.toFixed(1)}, ${vpOffset.y.toFixed(1)}] → vpX=${vpX.toFixed(1)}, vpY=${vpY.toFixed(1)}`);
    }
  }, [vpOffset, combo, vpX, vpY]);

  // Keyboard controls - route by lane type
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const config = BUTTON_CONFIG.find(c => c.key.toLowerCase() === key);
      if (config) {
        // CRITICAL: Route by lane - soundpads (0-3) use onPadHit, decks (-1,-2) use onDeckHoldStart
        if (config.lane >= 0 && config.lane <= 3 && onPadHit) {
          onPadHit(config.lane);
        } else if ((config.lane === -1 || config.lane === -2) && onDeckHoldStart) {
          onDeckHoldStart(config.lane);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const config = BUTTON_CONFIG.find(c => c.key.toLowerCase() === key);
      if (config && (config.lane === -1 || config.lane === -2) && onDeckHoldEnd) {
        onDeckHoldEnd(config.lane);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPadHit, onDeckHoldStart, onDeckHoldEnd]);

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
        
        // Check beatmap timing windows (notes don't appear outside these bounds)
        if (n.beatmapStart !== undefined && currentTime < n.beatmapStart) {
          continue; // Note hasn't started appearing yet
        }
        if (n.beatmapEnd !== undefined && currentTime > n.beatmapEnd) {
          continue; // Note has stopped appearing
        }
        
        const timeUntilHit = n.time - currentTime;
        
        if (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') {
          // HOLD NOTE RENDER WINDOW: Determine time-based visibility (independent of game state)
          // HOLD notes have their own timing distinct from TAP notes:
          // - TAP: appear 2000ms before, disappear 500ms after miss
          // - HOLD: appear 4000ms before (HOLD_RENDER_WINDOW_MS), stay visible through active states, fade on completion
          let visibilityEnd = currentTime + HOLD_ANIMATION_DURATION; // Default: show until animation ends
          
          // If failed (any failure state), show HOLD_ANIMATION_DURATION failure animation from failureTime
          if (n.tooEarlyFailure || n.holdMissFailure || n.holdReleaseFailure) {
            const failureTime = n.failureTime || currentTime;
            visibilityEnd = failureTime + HOLD_ANIMATION_DURATION;
          }
          // If release completed (either successful or failed), show animation from release point
          else if (n.pressReleaseTime || n.releaseTime) {
            const releasePoint = n.pressReleaseTime || n.releaseTime || currentTime;
            visibilityEnd = releasePoint + HOLD_ANIMATION_DURATION;
          }
          // If currently being held (pressed but not yet released), show through expected end + animation
          else if (n.pressHoldTime && n.pressHoldTime > 0) {
            const holdDuration = n.duration || 1000;
            const holdEndTime = n.pressHoldTime + holdDuration;
            visibilityEnd = holdEndTime + HOLD_ANIMATION_DURATION; // Phase 2 shrinking
          }
          
          // Visibility window: HOLD_RENDER_WINDOW_MS before hit to animation completion
          if (currentTime <= visibilityEnd && timeUntilHit <= HOLD_RENDER_WINDOW_MS) {
            // Track which hold note to show for this lane (earliest currently-visible note)
            if (!holdNotesByLane[n.lane]) {
              holdNotesByLane[n.lane] = n;
            } else {
              const stored = holdNotesByLane[n.lane];
              if (stored) {
                // Replace if:
                // 1. New note is earlier (lower time value), OR
                // 2. Stored note has already passed its visibility end (expired/completed animation)
                const storedIsExpired = currentTime > (stored.failureTime ? (stored.failureTime + HOLD_ANIMATION_DURATION) : (stored.time + LEAD_TIME + 2000));
                if (n.time < stored.time || storedIsExpired) {
                  holdNotesByLane[n.lane] = n;
                }
              }
            }
          }
        } else {
          // TAP NOTE: Add ALL non-terminal TAP notes to render list
          // Filtering (whether to actually render) happens in shouldRenderTapNote()
          // This ensures notes are ALWAYS available for rendering their full approach
          if (!n.hit && !n.missed) {
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
          {/* Concentric hexagons - faint tunnel walls with variable thickness (DYNAMIC VP for inner, FIXED outer corner endpoints) */}
          {HEXAGON_RADII.map((radius, idx) => {
            const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
            const progress = radius / maxRadius; // 0 to 1, thinner at center to thicker at edge
            
            // Outer hexagon is fixed, inner hexagons use DYNAMIC VP for perspective
            const centerX = idx === HEXAGON_RADII.length - 1 ? hexCenterX : vpX;
            const centerY = idx === HEXAGON_RADII.length - 1 ? hexCenterY : vpY;
            
            // Generate hexagon points - outer stays fixed, inner use dynamic VP
            const points = Array.from({ length: 6 }).map((_, i) => {
              const angle = (i * 60 * Math.PI) / 180;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
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
          <circle cx={vpX} cy={vpY} r="6" fill="rgba(0,255,255,0.05)" />
          
          {/* Soundpad buttons - 6 square interactive elements at hexagon corners (fixed constant VP) */}
          {BUTTON_CONFIG.map(({ lane, key, angle, color }) => {
            const rad = (angle * Math.PI) / 180;
            const cx = VANISHING_POINT_X + Math.cos(rad) * MAX_DISTANCE;
            const cy = VANISHING_POINT_Y + Math.sin(rad) * MAX_DISTANCE;
            
            return (
              <g key={`soundpad-button-${lane}`}>
                {/* Square button with fill and glow */}
                <rect
                  x={cx - 20}
                  y={cy - 20}
                  width="40"
                  height="40"
                  fill={color}
                  stroke={color}
                  strokeWidth="2"
                  opacity="0.8"
                  style={{ cursor: 'pointer' }}
                  onMouseDown={() => onPadHit?.(lane)}
                  onMouseUp={() => {}}
                  onMouseLeave={() => {}}
                  data-testid={`soundpad-square-${lane}`}
                />
                {/* Glow effect */}
                <rect
                  x={cx - 20}
                  y={cy - 20}
                  width="40"
                  height="40"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.3"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Key label */}
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={color}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="Rajdhani, monospace"
                  opacity="1"
                  style={{ pointerEvents: 'none' }}
                >
                  {key}
                </text>
              </g>
            );
          })}
          
          {/* Judgement line indicators - perpendicular to rays (TAP notes only) */}
          {/* Uses dynamic VP for perspective shift */}
          {[
            { angle: 120, color: '#FF007F', key: 'W' },   // W (lane 0) - top-left pink
            { angle: 60, color: '#0096FF', key: 'O' },    // O (lane 1) - top-right blue
            { angle: 300, color: '#BE00FF', key: 'I' },   // I (lane 2) - bottom-right purple
            { angle: 240, color: '#00FFFF', key: 'E' },   // E (lane 3) - bottom-left cyan
          ].map((lane, idx) => {
            const rad = (lane.angle * Math.PI) / 180;
            const radius = JUDGEMENT_RADIUS;
            const lineLength = TAP_JUDGEMENT_LINE_WIDTH;
            
            // Point on the ray at the radius - uses DYNAMIC VP for perspective
            const cx = vpX + Math.cos(rad) * radius;
            const cy = vpY + Math.sin(rad) * radius;
            
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
              </g>
            );
          })}
          
          {/* Variable-width lines for tunnel rays - 6 equally spaced rays from dynamic VP to FIXED outer hexagon corners */}
          {/* Rays pivot around dynamic VP but endpoints stay fixed at outer hexagon */}
          {allRayAngles.map((angle) => {
            const rad = (angle * Math.PI) / 180;
            
            const rayColor = getHealthBasedRayColor(health);
            
            // Fixed outer hexagon corner position (where ray ends)
            const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
            const cornerX = hexCenterX + maxRadius * Math.cos(rad);
            const cornerY = hexCenterY + maxRadius * Math.sin(rad);
            
            // Create line with multiple segments for smooth thickness and opacity gradient
            const segments = 12;
            return (
              <g key={`spoke-group-${angle}`}>
                {Array.from({ length: segments }).map((_, segIdx) => {
                  const segProgress = (segIdx + 1) / segments;
                  
                  // Interpolate from dynamic VP to fixed outer corner
                  const x1 = vpX + (cornerX - vpX) * ((segProgress - 1/segments));
                  const y1 = vpY + (cornerY - vpY) * ((segProgress - 1/segments));
                  
                  // End point - interpolate toward fixed outer corner
                  const x2 = vpX + (cornerX - vpX) * segProgress;
                  const y2 = vpY + (cornerY - vpY) * segProgress;
                  
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
                
                const pressHoldTime = note.pressHoldTime || 0;
                const holdDuration = note.duration || 1000;
                
                // Get failure states using helper
                const failures = getHoldNoteFailureStates(note);
                
                // ERROR CHECK: failureTime MUST be set when note has any failure
                if (failures.hasAnyFailure && note.failureTime === undefined) {
                  GameErrors.log(`CRITICAL: Note ${note.id} has ${failures.isTooEarlyFailure ? 'tooEarlyFailure' : failures.isHoldReleaseFailure ? 'holdReleaseFailure' : 'holdMissFailure'} but failureTime is missing!`);
                  return null; // Skip rendering to avoid animation timing corruption
                }
                
                const failureTime = note.failureTime || currentTime;
                
                // Early exit if failure animation is complete
                if (failures.hasAnyFailure) {
                  const timeSinceFail = Math.max(0, currentTime - failureTime);
                  if (timeSinceFail > HOLD_ANIMATION_DURATION) {
                    markAnimationCompletedIfDone(note, failures, timeSinceFail, currentTime);
                    return null;
                  }
                }
              
              // Get ray angle
              const rayAngle = getLaneAngle(note.lane);
              if (!Number.isFinite(rayAngle)) {
                console.warn(`Invalid ray angle for lane ${note.lane}`);
                return null;
              }
              
              // Calculate approach geometry (before press) - LANE ISOLATED
              const approachGeometry = calculateApproachGeometry(timeUntilHit, pressHoldTime, failures.isTooEarlyFailure, holdDuration);
              const approachNearDistance = approachGeometry.nearDistance;
              const approachFarDistance = approachGeometry.farDistance;
              
              // Determine collapse timing
              const collapseDuration = failures.hasAnyFailure ? FAILURE_ANIMATION_DURATION : holdDuration;
              
              // Calculate locked near distance (where note "grabs" on press) - LANE ISOLATED
              const lockedNearDistance = calculateLockedNearDistance(note, pressHoldTime, failures.isTooEarlyFailure, approachNearDistance, failureTime);
              
              // Calculate collapse geometry (after press or for failures) - LANE ISOLATED
              const stripWidth = (note.duration || 1000) * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
              const farDistanceAtPress = lockedNearDistance ? Math.max(1, lockedNearDistance - stripWidth) : approachFarDistance;
              const collapseGeo = calculateCollapseGeometry(
                pressHoldTime,
                collapseDuration,
                currentTime,
                lockedNearDistance || approachNearDistance,
                farDistanceAtPress,
                approachNearDistance,
                approachFarDistance,
                note.hit  // Pass successful hit flag so they collapse immediately
              );
              
              const nearDistance = collapseGeo.nearDistance;
              const farDistance = collapseGeo.farDistance;
              const collapseProgress = collapseGeo.collapseProgress;
              
              // CRITICAL: Skip rendering once collapse animation completes
              if (collapseProgress >= 1.0) {
                return null;
              }
              
              // ERROR HANDLING: Check if geometry proceeds past judgement line when it shouldn't
              const isSuccessfulHit = note.hit;
              const isHoldReleaseFailure = failures.isHoldReleaseFailure;
              const shouldNotPassJudgement = isSuccessfulHit || isHoldReleaseFailure;
              
              if (shouldNotPassJudgement && nearDistance > JUDGEMENT_RADIUS) {
                GameErrors.log(
                  `GEOMETRY ERROR: Note ${note.id} (${isSuccessfulHit ? 'successful hit' : 'holdReleaseFailure'}) ` +
                  `nearDistance=${nearDistance.toFixed(1)} exceeds JUDGEMENT_RADIUS=${JUDGEMENT_RADIUS}. ` +
                  `lockedNearDistance=${lockedNearDistance?.toFixed(1)}, ` +
                  `collapseProgress=${collapseProgress.toFixed(2)}, ` +
                  `pressHoldTime=${pressHoldTime}, currentTime=${currentTime}`
                );
              }
              
              // Determine greyscale state based on failure type and timing
              const greyscaleState = determineGreyscaleState(failures, pressHoldTime, approachNearDistance);
              
              // Calculate glow intensity
              const glowCalc = calculateHoldNoteGlow(pressHoldTime, currentTime, collapseDuration, approachGeometry.nearDistance > 0 ? (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1) : 0, note);
              const { finalGlowScale } = glowCalc;
              
              // Calculate trapezoid corners using helper function
              const corners = getTrapezoidCorners(
                rayAngle,
                nearDistance,
                farDistance,
                vpX,
                vpY,
                note.id
              );
              
              if (!corners) {
                if (failures.hasAnyFailure) {
                  GameErrors.updateAnimation(note.id, { status: 'failed', errorMsg: 'Invalid trapezoid geometry' });
                }
                return null;
              }
              
              const { x1, y1, x2, y2, x3, y3, x4, y4 } = corners;
              
              // Track hold note animation lifecycle
              trackHoldNoteAnimationLifecycle(note, failures, currentTime);
              
              // Calculate opacity (fade during collapse for failures)
              const approachProgress = (approachGeometry.nearDistance - 1) / (JUDGEMENT_RADIUS - 1);
              let opacity = 0.4 + Math.min(approachProgress, 1.0) * 0.6;
              
              // Fade out for ALL failures based on time since failure
              if (failures.hasAnyFailure && failureTime) {
                const timeSinceFailure = Math.max(0, currentTime - failureTime);
                const failFadeProgress = Math.min(timeSinceFailure / HOLD_ANIMATION_DURATION, 1.0);
                opacity = opacity * (1.0 - failFadeProgress);
              }
              
              // Override with collapse fade if note was successfully pressed
              if (collapseProgress > 0 && note.pressHoldTime && note.pressHoldTime > 0) {
                opacity = Math.max(1.0 - collapseProgress, 0.0);
              }
              
              // Calculate colors using helper
              const baseColor = getColorForLane(note.lane);
              const colors = calculateHoldNoteColors(greyscaleState.isGreyed, note.lane, baseColor);
              
              // Calculate stroke width
              const strokeWidth = 2 + (collapseProgress > 0 ? (1 - collapseProgress) * 2 : approachProgress * 2);
              
              return (
                <polygon
                  key={note.id}
                  points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`}
                  fill={colors.fillColor}
                  opacity={opacity}
                  stroke={colors.strokeColor}
                  strokeWidth={strokeWidth}
                  style={{
                    filter: greyscaleState.isGreyed 
                      ? `drop-shadow(0 0 8px ${GREYSCALE_GLOW_COLOR}) grayscale(1)`
                      : `drop-shadow(0 0 ${Math.max(20, 25 * finalGlowScale)}px ${colors.glowColor}) drop-shadow(0 0 ${Math.max(12, 15 * finalGlowScale)}px ${colors.glowColor})`,
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
            const cx = vpX + Math.cos(rad) * radius;
            const cy = vpY + Math.sin(rad) * radius;
            
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

          {/* TAP notes - using helper functions for clarity */}
          {visibleNotes
            .filter(n => n.type !== 'SPIN_LEFT' && n.type !== 'SPIN_RIGHT')
            .map(note => {
            const timeUntilHit = note.time - currentTime;
            const rawProgress = 1 - (timeUntilHit / 2000); // Unclamped
            const clampedProgress = Math.max(0, Math.min(1, rawProgress));
            
            // Get TAP note state using helper
            const state = getTapNoteState(note, currentTime);
            
            // Validate and early exit
            if (state.isFailed && !state.failureTime) {
              GameErrors.log(`Down3DNoteLane: TAP failure missing failureTime: ${note.id}`);
              return null;
            }
            
            // Check if should render (time-based, not progress-based)
            if (!shouldRenderTapNote(state, timeUntilHit)) {
              return null;
            }
            
            // Track animation lifecycle
            trackTapNoteAnimation(note, state, currentTime);
            
            // Get rendering data
            const tapRayAngle = getLaneAngle(note.lane);
            const noteColor = getColorForLane(note.lane);
            // Use unclamped progress for geometry (failed/hit notes continue past judgement line)
            const progressForGeometry = (state.isFailed || state.isHit) ? rawProgress : clampedProgress;
            const geometry = calculateTapNoteGeometry(progressForGeometry, tapRayAngle, vpX, vpY, state.isHit, note.pressHoldTime || 0, currentTime, state.isFailed, note.time);
            // Pass both raw and clamped - calculateTapNoteStyle selects the appropriate one based on state
            const style = calculateTapNoteStyle(clampedProgress, state, noteColor, rawProgress);
            
            return (
              <polygon
                key={note.id}
                points={geometry.points}
                fill={style.fill}
                opacity={style.opacity}
                stroke={style.stroke}
                strokeWidth={1.5}
                style={{
                  filter: style.filter,
                  transition: 'all 0.05s linear',
                  mixBlendMode: 'screen',
                }}
              />
            );
          })}
        </svg>

      </div>
    </div>
  );
}
