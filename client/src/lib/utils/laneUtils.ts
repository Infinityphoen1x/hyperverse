import { MAX_HEALTH } from '@/lib/config';
import { GameErrors } from '@/lib/errors/errorLog';
import { useGameStore } from '@/stores/useGameStore';

/**
 * Position to angle mapping (degrees) - absolute coordinates
 * Maps position index to its base angle in the tunnel
 * 
 * Positions -1, -2: Horizontal axis (HOLD completion targets, fixed)
 * Positions 0-3: Diamond formation (rotate during HOLD notes)
 * 
 * IMPORTANT: Must match POSITION_BASE_ANGLES in rotationConstants.ts
 */
export const POSITION_ANGLE_MAP: Record<number, number> = {
  [-2]: 0,   // P: Right horizontal (HOLD target)
  [-1]: 180, // Q: Left horizontal (HOLD target)
  [0]: 120,  // W: Top-left (rotates)
  [1]: 60,   // O: Top-right (rotates)
  [2]: 300,  // I: Bottom-right (rotates)
  [3]: 240,  // E: Bottom-left (rotates)
};

// Legacy export for backward compatibility
export const LANE_ANGLE_MAP = POSITION_ANGLE_MAP;

/**
 * Get the angle for a specific position with optional rotation offset
 * @param position Position index (-2, -1, 0-3)
 * @param rotationOffset Additional rotation in degrees (default: 0)
 * @returns Angle in degrees
 */
export const getPositionAngle = (position: number, rotationOffset: number = 0): number => {
  const angle = POSITION_ANGLE_MAP[position];
  if (!Number.isFinite(angle)) {
    GameErrors.log(`Invalid position ${position}, using default angle 0`);
    return 0;
  }
  return angle + rotationOffset;
};

// Legacy function for backward compatibility
export const getLaneAngle = getPositionAngle;

// Position to color mapping with health-based desaturation
export const getColorForPosition = (position: number, health: number = MAX_HEALTH): string => {
  const baseColor = (() => {
    switch (position) {
      case -1: return '#00FF00'; // Q - green
      case -2: return '#FF0000'; // P - red
      case 0: return '#FF6600'; // W - neon orange
      case 1: return '#0096FF'; // O - blue
      case 2: return '#BE00FF'; // I - purple
      case 3: return '#00FFFF'; // E - cyan
      default: return '#FFFFFF';
    }
  })();

  const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH;
  if (healthFactor === 0) return baseColor;

  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  const newR = Math.round(r + (255 - r) * healthFactor);
  const newG = Math.round(g * (1 - healthFactor));
  const newB = Math.round(b * (1 - healthFactor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase();
};

// Legacy function for backward compatibility
export const getColorForLane = getColorForPosition;
