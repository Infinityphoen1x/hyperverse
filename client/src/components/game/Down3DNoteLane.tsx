import { motion } from "framer-motion";
import { Note, GameErrors } from "@/lib/gameEngine";
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
  TAP_RENDER_WINDOW_MS,
  TAP_FALLTHROUGH_WINDOW_MS,
  HOLD_RENDER_WINDOW_MS,
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

// ============================================================================
// HELPER FUNCTIONS FOR HOLD NOTE STATE MANAGEMENT
// ============================================================================

/** Extract all failure states from a note */
interface HoldNoteFailureStates {
  isTooEarlyFailure: boolean;
  isHoldReleaseFailure: boolean;
  isHoldMissFailure: boolean;
  hasAnyFailure: boolean;
}

const getHoldNoteFailureStates = (note: Note): HoldNoteFailureStates => {
  const isTooEarlyFailure = note.tooEarlyFailure || false;
  const isHoldReleaseFailure = note.holdReleaseFailure || false;
  const isHoldMissFailure = note.holdMissFailure || false;
  
  return {
    isTooEarlyFailure,
    isHoldReleaseFailure,
    isHoldMissFailure,
    hasAnyFailure: isTooEarlyFailure || isHoldReleaseFailure || isHoldMissFailure,
  };
};

/** Determine if note should render in greyscale based on failure type and timing */
interface GreyscaleState {
  isGreyed: boolean;
  reason: 'none' | 'tooEarlyImmediate' | 'holdMissAtJudgement' | 'holdReleaseFailure';
}

const determineGreyscaleState = (
  failures: HoldNoteFailureStates,
  pressHoldTime: number,
  approachNearDistance: number
): GreyscaleState => {
  // holdReleaseFailure: Always greyscale immediately
  if (failures.isHoldReleaseFailure) {
    return { isGreyed: true, reason: 'holdReleaseFailure' };
  }
  
  if (failures.isTooEarlyFailure && pressHoldTime > 0) {
    return { isGreyed: true, reason: 'tooEarlyImmediate' };
  }
  
  if (failures.isHoldMissFailure && approachNearDistance >= JUDGEMENT_RADIUS) {
    return { isGreyed: true, reason: 'holdMissAtJudgement' };
  }
  
  return { isGreyed: false, reason: 'none' };
};

/** Mark animation as completed if it's done failing */
const markAnimationCompletedIfDone = (
  note: Note,
  failures: HoldNoteFailureStates,
  timeSinceFail: number,
  currentTime: number
): void => {
  if (timeSinceFail > HOLD_ANIMATION_DURATION) {
    const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
    if (failures.isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
    if (failures.isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
    if (failures.isHoldMissFailure) failureTypes.push('holdMissFailure');
    
    for (const failureType of failureTypes) {
      const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
      if (animEntry && animEntry.status !== 'completed') {
        GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
      }
    }
  }
};

/** Calculate geometry for approach phase (before press) */
interface ApproachGeometry {
  nearDistance: number;
  farDistance: number;
}

const calculateApproachGeometry = (
  timeUntilHit: number,
  pressHoldTime: number,
  isTooEarlyFailure: boolean,
  holdDuration: number
): ApproachGeometry => {
  const stripWidth = (holdDuration || 1000) * HOLD_NOTE_STRIP_WIDTH_MULTIPLIER;
  
  const rawApproachProgress = (LEAD_TIME - timeUntilHit) / LEAD_TIME;
  const isSuccessfulPress = pressHoldTime > 0 && !isTooEarlyFailure;
  const approachProgress = isSuccessfulPress ? Math.min(rawApproachProgress, 1.0) : rawApproachProgress;
  
  const nearDistance = Math.max(1, 1 + (approachProgress * (JUDGEMENT_RADIUS - 1)));
  const farDistance = Math.max(1, nearDistance - stripWidth);
  
  return { nearDistance, farDistance };
};

// ============================================================================
// HELPER FUNCTIONS FOR TAP NOTE RENDERING
// ============================================================================

/** TAP note state tracking */
interface TapNoteState {
  isHit: boolean;
  isFailed: boolean;
  failureTime: number | undefined;
  hitTime: number | undefined;
  timeSinceFail: number;
  timeSinceHit: number;
}

const getTapNoteState = (note: Note, currentTime: number): TapNoteState => {
  const isHit = note.hit || false;
  const isFailed = note.tapMissFailure || false;
  const failureTime = note.failureTime;
  const hitTime = note.hitTime;
  
  const timeSinceFail = failureTime ? Math.max(0, currentTime - failureTime) : 0;
  const timeSinceHit = isHit && hitTime ? Math.max(0, currentTime - hitTime) : 0;
  
  return { isHit, isFailed, failureTime, hitTime, timeSinceFail, timeSinceHit };
};

/** Determine if TAP note should still be rendered */
const shouldRenderTapNote = (state: TapNoteState, progress: number): boolean => {
  // Out of visible progress window
  if (progress < 0 || progress > 1.25) return false;
  
  // After hit animation finishes (600ms)
  if (state.isHit && state.timeSinceHit >= 600) return false;
  
  // After failure animation finishes (1100ms)
  if (state.isFailed && state.timeSinceFail > 1100) return false;
  
  return true;
};

/** Track TAP note animation lifecycle in error log */
const trackTapNoteAnimation = (note: Note, state: TapNoteState, currentTime: number): void => {
  if (!state.isFailed) return; // Only track failures
  
  const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === 'tapMissFailure');
  if (!animEntry) {
    // First render: create tracking entry
    GameErrors.trackAnimation(note.id, 'tapMissFailure', state.failureTime || currentTime);
  } else if (animEntry.status === 'pending') {
    // Transition from pending to rendering (or skip if already finished)
    if (state.timeSinceFail >= 1100) {
      GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
    } else {
      GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
    }
  } else if (animEntry.status === 'rendering' && state.timeSinceFail >= 1100) {
    // Mark completed when animation finishes
    GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
  }
};

/** Calculate geometry for TAP note trapezoid */
interface TapNoteGeometry {
  x1: number; y1: number;
  x2: number; y2: number;
  x3: number; y3: number;
  x4: number; y4: number;
  points: string;
}

const calculateTapNoteGeometry = (
  progress: number,
  tapRayAngle: number
): TapNoteGeometry => {
  const MIN_DEPTH = 5;
  const MAX_DEPTH = 40;
  const TRAPEZOID_DEPTH = MIN_DEPTH + (progress * (MAX_DEPTH - MIN_DEPTH));
  const nearDist = 1 + (progress * (JUDGEMENT_RADIUS - 1));
  const farDist = Math.max(0.1, nearDist - TRAPEZOID_DEPTH);
  
  // Narrower flanking angles (±8°) for compact appearance
  const tapLeftRayAngle = tapRayAngle - 8;
  const tapRightRayAngle = tapRayAngle + 8;
  const tapLeftRad = (tapLeftRayAngle * Math.PI) / 180;
  const tapRightRad = (tapRightRayAngle * Math.PI) / 180;
  
  const x1 = VANISHING_POINT_X + Math.cos(tapLeftRad) * farDist;
  const y1 = VANISHING_POINT_Y + Math.sin(tapLeftRad) * farDist;
  const x2 = VANISHING_POINT_X + Math.cos(tapRightRad) * farDist;
  const y2 = VANISHING_POINT_Y + Math.sin(tapRightRad) * farDist;
  const x3 = VANISHING_POINT_X + Math.cos(tapRightRad) * nearDist;
  const y3 = VANISHING_POINT_Y + Math.sin(tapRightRad) * nearDist;
  const x4 = VANISHING_POINT_X + Math.cos(tapLeftRad) * nearDist;
  const y4 = VANISHING_POINT_Y + Math.sin(tapLeftRad) * nearDist;
  
  return {
    x1, y1, x2, y2, x3, y3, x4, y4,
    points: `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`,
  };
};

/** Calculate opacity and visual styling for TAP note */
interface TapNoteStyle {
  opacity: number;
  fill: string;
  stroke: string;
  filter: string;
  hitFlashIntensity: number;
}

const calculateTapNoteStyle = (
  progress: number,
  state: TapNoteState,
  noteColor: string
): TapNoteStyle => {
  let opacity = 0.4 + (progress * 0.6);
  if (state.isFailed) {
    const failProgress = Math.min(state.timeSinceFail / 1000, 1.0);
    opacity = (1 - failProgress) * 0.6;
  } else if (state.isHit) {
    opacity = (1 - (state.timeSinceHit / 600)) * (0.4 + (progress * 0.6));
  }
  
  const hitFlashIntensity = state.isHit && state.timeSinceHit < 600 
    ? Math.max(0, 1 - (state.timeSinceHit / 600)) 
    : 0;
  
  const fill = state.isFailed ? 'rgba(80,80,80,0.3)' : noteColor;
  const stroke = state.isFailed ? 'rgba(100,100,100,0.6)' : 'rgba(255,255,255,0.8)';
  
  const filter = state.isFailed
    ? 'drop-shadow(0 0 8px rgba(100,100,100,0.6)) grayscale(1)'
    : hitFlashIntensity > 0
      ? `brightness(1.8) drop-shadow(0 0 20px ${noteColor})`
      : `drop-shadow(0 0 ${10 * progress}px ${noteColor})`;
  
  return { opacity: Math.max(opacity, 0), fill, stroke, filter, hitFlashIntensity };
};

// ============================================================================
// HELPER FUNCTIONS FOR HOLD NOTE RENDERING
// ============================================================================

/** Calculate collapse phase geometry (after press) */
interface CollapseGeometry {
  nearDistance: number;
  farDistance: number;
  collapseProgress: number;
}

const calculateCollapseGeometry = (
  pressHoldTime: number,
  collapseDuration: number,
  currentTime: number,
  lockedNearDistance: number,
  farDistanceAtPress: number,
  approachNearDistance: number,
  approachFarDistance: number,
  isSuccessfulHit: boolean = false
): CollapseGeometry => {
  // For unpressed notes (holdMissFailure): use approach geometry, no collapse
  if (!pressHoldTime || pressHoldTime === 0) {
    // Exception: successful hits should collapse from locked position even with pressHoldTime=0
    if (!isSuccessfulHit) {
      return { nearDistance: approachNearDistance, farDistance: approachFarDistance, collapseProgress: 0 };
    }
    // For successful hits: start collapse immediately from locked position
    pressHoldTime = currentTime;
  }
  
  const timeSincePress = currentTime - pressHoldTime;
  const collapseProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
  
  // During collapse: near end locked, far end contracts toward it
  const nearDistance = lockedNearDistance;
  const farDistance = farDistanceAtPress * (1 - collapseProgress) + lockedNearDistance * collapseProgress;
  
  return { nearDistance, farDistance, collapseProgress };
};

/** Calculate locked near distance (where note "grabs" on press) */
const calculateLockedNearDistance = (
  note: Note,
  pressHoldTime: number,
  isTooEarlyFailure: boolean,
  approachNearDistance: number,
  failureTime: number | null
): number | null => {
  // ISOLATED: Successful hits - lock at judgement line (187px) - CHECK FIRST before pressHoldTime
  if (note.hit) {
    return JUDGEMENT_RADIUS;
  }
  
  // No press: includes holdMissFailure (never pressed)
  if (!pressHoldTime || pressHoldTime === 0) return null;
  
  // ISOLATED: tooEarlyFailure - DON'T lock, use approach geometry
  if (isTooEarlyFailure) return null;
  
  // ISOLATED: holdReleaseFailure - lock at position where failure occurred (at failureTime)
  if (note.holdReleaseFailure) {
    if (!failureTime) return null;
    const timeUntilHitAtFailure = note.time - failureTime;
    const approachProgressAtFailure = Math.max((LEAD_TIME - timeUntilHitAtFailure) / LEAD_TIME, 0);
    return Math.max(1, 1 + (approachProgressAtFailure * (JUDGEMENT_RADIUS - 1)));
  }
  
  // Safety fallback (should not reach here)
  return approachNearDistance;
};

/** Calculate glow intensity based on press state and collapse */
interface GlowCalculation {
  glowScale: number;
  collapseGlow: number;
  finalGlowScale: number;
}

const calculateHoldNoteGlow = (
  pressHoldTime: number,
  currentTime: number,
  collapseDuration: number,
  approachProgress: number,
  note: Note
): GlowCalculation => {
  const hasActivePress = pressHoldTime > 0 || note.hit;
  
  // Base glow intensity scales with approach
  const glowScale = hasActivePress ? 0.2 + (Math.min(approachProgress, 1.0) * 0.8) : 0.05;
  
  // During collapse: decrease glow as trapezoid collapses
  let collapseGlow = 0;
  if (pressHoldTime && pressHoldTime > 0) {
    const timeSincePress = currentTime - pressHoldTime;
    const collapseGlowProgress = Math.min(Math.max(timeSincePress / collapseDuration, 0), 1.0);
    collapseGlow = collapseGlowProgress > 0 ? (1 - collapseGlowProgress) * 0.8 : 0;
  }
  
  const finalGlowScale = hasActivePress ? Math.max(glowScale - collapseGlow, 0.1) : 0.05;
  
  return { glowScale, collapseGlow, finalGlowScale };
};

/** Calculate colors and styling for HOLD note */
interface HoldNoteColors {
  fillColor: string;
  glowColor: string;
  strokeColor: string;
}

const calculateHoldNoteColors = (
  isGreyed: boolean,
  lane: number,
  baseColor: string
): HoldNoteColors => {
  if (isGreyed) {
    return {
      fillColor: GREYSCALE_FILL_COLOR,
      glowColor: GREYSCALE_GLOW_COLOR,
      strokeColor: 'rgba(120, 120, 120, 1)',
    };
  }
  
  // Use deck colors (fully opaque) or pad colors
  const fillColor = lane === -1 
    ? COLOR_DECK_LEFT 
    : lane === -2 
    ? COLOR_DECK_RIGHT 
    : baseColor;
  
  return {
    fillColor,
    glowColor: fillColor,
    strokeColor: 'rgba(255,255,255,1)',
  };
};

/** Track HOLD note animation lifecycle for all failure types */
const trackHoldNoteAnimationLifecycle = (
  note: Note,
  failures: HoldNoteFailureStates,
  currentTime: number,
  collapseProgress: number
): void => {
  if (!failures.hasAnyFailure) return; // Only track failures
  
  const failureTypes: Array<'tooEarlyFailure' | 'holdReleaseFailure' | 'holdMissFailure'> = [];
  if (failures.isTooEarlyFailure) failureTypes.push('tooEarlyFailure');
  if (failures.isHoldReleaseFailure) failureTypes.push('holdReleaseFailure');
  if (failures.isHoldMissFailure) failureTypes.push('holdMissFailure');
  
  for (const failureType of failureTypes) {
    const animEntry = GameErrors.animations.find(a => a.noteId === note.id && a.type === failureType);
    const failureTime = animEntry?.failureTime || note.failureTime || currentTime;
    const timeSinceFailure = Math.max(0, currentTime - failureTime);
    
    if (!animEntry) {
      // Create tracking entry for this failure type
      GameErrors.trackAnimation(note.id, failureType, note.failureTime || currentTime);
    } else if (animEntry.status === 'pending') {
      // Skip if animation already finished, otherwise mark rendering
      if (timeSinceFailure >= HOLD_ANIMATION_DURATION) {
        GameErrors.updateAnimation(note.id, { status: 'completed', renderStart: currentTime, renderEnd: currentTime });
      } else {
        GameErrors.updateAnimation(note.id, { status: 'rendering', renderStart: currentTime });
      }
    }
    
    // Mark complete when collapse finishes
    if (collapseProgress >= 0.99 && animEntry && animEntry.status !== 'completed') {
      GameErrors.updateAnimation(note.id, { status: 'completed', renderEnd: currentTime });
    }
  }
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
  // Jolt animation state for vanishing point
  const [joltOffset, setJoltOffset] = useState({ x: 0, y: 0 });
  const prevComboMilestoneRef = useRef<number>(0);
  const animationStartRef = useRef<number>(0);
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  const [, setRenderTrigger] = useState(0);
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
  
  // Smooth animation loop for vanishing point travel
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - animationStartRef.current;
      
      if (elapsed < ANGLE_SHIFT_DURATION) {
        const progress = Math.min(elapsed / ANGLE_SHIFT_DURATION, 1);
        // Smooth easing: ease-out (deceleration)
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const newX = currentOffsetRef.current.x + (targetOffsetRef.current.x - currentOffsetRef.current.x) * easeProgress;
        const newY = currentOffsetRef.current.y + (targetOffsetRef.current.y - currentOffsetRef.current.y) * easeProgress;
        
        setJoltOffset({ x: newX, y: newY });
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
  
  // Detect combo milestones (10, 20, 30, etc.) - shift vanishing point to new angle, stays offset
  useEffect(() => {
    const currentMilestone = Math.floor(combo / 10) * 10;
    if (combo > 0 && currentMilestone !== prevComboMilestoneRef.current) {
      prevComboMilestoneRef.current = currentMilestone;
      
      // Each milestone: smoothly shift to NEW random angle - STAYS OFFSET (viewing angle shift)
      const angle = Math.random() * Math.PI * 2;
      const newOffsetX = Math.cos(angle) * ANGLE_SHIFT_DISTANCE;
      const newOffsetY = Math.sin(angle) * ANGLE_SHIFT_DISTANCE;
      
      // Validate the shift before applying
      validateVanishingPointShift(currentMilestone, joltOffset, { x: newOffsetX, y: newOffsetY });
      
      // Start smooth transition from current offset to new angle
      animationStartRef.current = Date.now();
      currentOffsetRef.current = { ...joltOffset };
      targetOffsetRef.current = { x: newOffsetX, y: newOffsetY };
      // NO RETURN TO CENTER - stays at new offset for immersive "tunnel angle" effect
    } else if (combo === 0) {
      prevComboMilestoneRef.current = 0;
      
      // Validate return to center on combo break
      if (vanishingPointShiftsRef.current.length > 0) {
        const lastShift = vanishingPointShiftsRef.current[vanishingPointShiftsRef.current.length - 1];
        const returnDistance = Math.sqrt(Math.pow(joltOffset.x, 2) + Math.pow(joltOffset.y, 2));
        console.log(`[VP-RESET] Combo break: Returning to center from [${joltOffset.x.toFixed(1)}, ${joltOffset.y.toFixed(1)}] (distance: ${returnDistance.toFixed(2)}px)`);
      }
      
      // Smooth return to center on combo break
      animationStartRef.current = Date.now();
      currentOffsetRef.current = { ...joltOffset };
      targetOffsetRef.current = { x: 0, y: 0 };
    }
  }, [combo, joltOffset]);

  
  // Calculate dynamic vanishing point with jolt offset
  const vpX = VANISHING_POINT_X + joltOffset.x;
  const vpY = VANISHING_POINT_Y + joltOffset.y;

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
    const xPosition = vpX + Math.cos(rad) * MAX_DISTANCE;
    const yPosition = vpY + Math.sin(rad) * MAX_DISTANCE;
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
              const x = vpX + radius * Math.cos(angle);
              const y = vpY + radius * Math.sin(angle);
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
              trackHoldNoteAnimationLifecycle(note, failures, currentTime, collapseProgress);
              
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
            const progress = 1 - (timeUntilHit / 2000);
            
            // Get TAP note state using helper
            const state = getTapNoteState(note, currentTime);
            
            // Validate and early exit
            if (state.isFailed && !state.failureTime) {
              GameErrors.log(`Down3DNoteLane: TAP failure missing failureTime: ${note.id}`);
              return null;
            }
            
            // Check if should render
            if (!shouldRenderTapNote(state, progress)) {
              return null;
            }
            
            // Track animation lifecycle
            trackTapNoteAnimation(note, state, currentTime);
            
            // Get rendering data
            const tapRayAngle = getLaneAngle(note.lane);
            const noteColor = getColorForLane(note.lane);
            const geometry = calculateTapNoteGeometry(progress, tapRayAngle);
            const style = calculateTapNoteStyle(progress, state, noteColor);
            
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
