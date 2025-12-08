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

// Base lane angles (before any rotation)
export const LANE_BASE_ANGLES: Record<number, number> = {
  0: 120,  // W: top-left
  1: 60,   // O: top-right
  2: 300,  // I: bottom-right
  3: 240,  // E: bottom-left
  [-1]: 180, // Q: left deck
  [-2]: 0,   // P: right deck
};

// Deck positions (fixed on x-axis)
export const DECK_ANGLES = {
  Q: 180,  // Left deck (green)
  P: 0,    // Right deck (red)
} as const;

// Lane pairing validation - which lanes are opposite (180° apart)
export const OPPOSITE_LANES: Record<number, number> = {
  0: 2,   // W ↔ I
  1: 3,   // O ↔ E
  2: 0,   // I ↔ W
  3: 1,   // E ↔ O
  [-1]: -2, // Q ↔ P
  [-2]: -1, // P ↔ Q
};

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

// Check if a lane requires rotation for HOLD notes
export function requiresRotation(lane: number): boolean {
  return lane >= 0 && lane <= 3;
}

// Get target rotation delta for a lane (DYNAMIC - considers current rotation)
// Returns the shortest angular distance to rotate to align with closest deck
export function getTargetRotation(lane: number, currentRotation: number = 0): number {
  // Deck lanes don't need rotation
  if (lane === -1 || lane === -2) return 0;
  
  // Get base angle for the lane
  const laneBaseAngle = LANE_BASE_ANGLES[lane];
  if (laneBaseAngle === undefined) return 0;
  
  // Calculate current angle of the lane after rotation
  const currentLaneAngle = normalizeAngle(laneBaseAngle + currentRotation);
  
  // Calculate shortest rotation to each deck
  const toQ = shortestAngularDistance(currentLaneAngle, DECK_ANGLES.Q);
  const toP = shortestAngularDistance(currentLaneAngle, DECK_ANGLES.P);
  
  // Return rotation delta to closest deck
  return Math.abs(toQ) < Math.abs(toP) ? toQ : toP;
}

// Check if two lanes are opposite (valid for simultaneous HOLD)
export function areOpposite(lane1: number, lane2: number): boolean {
  return OPPOSITE_LANES[lane1] === lane2;
}
