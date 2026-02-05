// Rotation timing and configuration constants
export const ROTATION_CONFIG = {
  // Fixed duration for now (dynamic speed to be implemented later)
  ROTATION_DURATION: 1500, // ms - matches animation hook
  ROTATION_SETTLE_TIME: 200, // ms buffer after rotation completes
  
  // Calculate when to trigger rotation before note arrives
  // rotationStart = noteTime - LEAD_TIME - ROTATION_DURATION - SETTLE_TIME
  get ROTATION_TRIGGER_ADVANCE() {
    // We'll calculate this dynamically based on LEAD_TIME
    return 1700; // ROTATION_DURATION + SETTLE_TIME
  },
} as const;

/**
 * Positions where HOLD notes complete (horizontal axis)
 * These positions do NOT rotate - they're always at 0° and 180°
 */
export const HORIZONTAL_POSITIONS = [-1, -2] as const;

// Base position angles (absolute, before any rotation)
// Positions -1/-2 are horizontal (fixed), positions 0-3 rotate
export const POSITION_BASE_ANGLES: Record<number, number> = {
  0: 120,  // W: top-left (rotates)
  1: 60,   // O: top-right (rotates)
  2: 300,  // I: bottom-right (rotates)
  3: 240,  // E: bottom-left (rotates)
  [-1]: 180, // Q: left horizontal (FIXED - HOLD completion target)
  [-2]: 0,   // P: right horizontal (FIXED - HOLD completion target)
};

// Legacy export for backward compatibility
export const LANE_BASE_ANGLES = POSITION_BASE_ANGLES;

// Horizontal axis angles (where HOLD notes complete)
export const HORIZONTAL_ANGLES = {
  LEFT: 180,  // Position -1 (Q)
  RIGHT: 0,   // Position -2 (P)
} as const;

// Legacy deck angles export
export const DECK_ANGLES = {
  Q: 180,  // Left horizontal
  P: 0,    // Right horizontal
} as const;

// Position pairing validation - which positions are opposite (180° apart)
export const OPPOSITE_POSITIONS: Record<number, number> = {
  0: 2,   // W ↔ I
  1: 3,   // O ↔ E
  2: 0,   // I ↔ W
  3: 1,   // E ↔ O
  [-1]: -2, // Q ↔ P (horizontal pair)
  [-2]: -1, // P ↔ Q (horizontal pair)
};

// Legacy export for backward compatibility
export const OPPOSITE_LANES = OPPOSITE_POSITIONS;

// Calculate shortest angular distance between two angles
function shortestAngularDistance(from: number, to: number): number {
  let diff = to - from;
  // Normalize to -180 to 180 range
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
}

// Normalize angle to 0-360 range
function normalizeAngle(angle: number): number {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

// Get shortest rotation delta to return to neutral (0°)
export function getRotationToNeutral(currentRotation: number): number {
  const normalized = normalizeAngle(currentRotation);
  return shortestAngularDistance(normalized, 0);
}

// Check if a position requires rotation for HOLD notes
// Positions on horizontal axis (-1, -2) don't rotate; others do
export function requiresRotation(position: number): boolean {
  return !HORIZONTAL_POSITIONS.includes(position as any);
}

// Get target rotation delta for a position (DYNAMIC - considers current rotation)
// Returns the shortest angular distance to rotate to align with closest horizontal position
export function getTargetRotation(position: number, currentRotation: number = 0): number {
  // Horizontal positions don't need rotation - they're already at 0° or 180°
  if (HORIZONTAL_POSITIONS.includes(position as any)) return 0;
  
  // Get base angle for the position
  const positionBaseAngle = POSITION_BASE_ANGLES[position];
  if (positionBaseAngle === undefined) return 0;
  
  // Calculate current angle of the position after rotation
  const currentPositionAngle = normalizeAngle(positionBaseAngle + currentRotation);
  
  // Calculate shortest rotation to each horizontal position
  const toLeft = shortestAngularDistance(currentPositionAngle, HORIZONTAL_ANGLES.LEFT);
  const toRight = shortestAngularDistance(currentPositionAngle, HORIZONTAL_ANGLES.RIGHT);
  
  // Return rotation delta to closest horizontal position
  return Math.abs(toLeft) < Math.abs(toRight) ? toLeft : toRight;
}

// Check if two positions are opposite (valid for simultaneous HOLD)
export function areOppositePositions(pos1: number, pos2: number): boolean {
  return OPPOSITE_POSITIONS[pos1] === pos2;
}

// Legacy function for backward compatibility
export function areOpposite(lane1: number, lane2: number): boolean {
  return areOppositePositions(lane1, lane2);
}
