import { MAX_HEALTH } from '@/lib/config';
import { GameErrors } from '@/lib/errors/errorLog';
import { useGameStore } from '@/stores/useGameStore';

/**
 * Lane to angle mapping (degrees)
 * Maps lane index to its base angle in the tunnel
 * 
 * Lanes 0-3: TAP note lanes (WEIO keys)
 * Lanes -1, -2: SPIN deck lanes (Q, P keys)
 */
export const LANE_ANGLE_MAP: Record<number, number> = {
  [-2]: 0,   // P key - Right deck
  [-1]: 180, // Q key - Left deck
  [0]: 120,  // W key - Top lane
  [1]: 60,   // O key - Top-right lane
  [2]: 300,  // I key - Bottom-right lane
  [3]: 240,  // E key - Bottom-left lane
};

/**
 * Get the angle for a specific lane with optional rotation offset
 * @param lane Lane index (-2, -1, 0-3)
 * @param rotationOffset Additional rotation in degrees (default: 0)
 * @returns Angle in degrees
 */
export const getLaneAngle = (lane: number, rotationOffset: number = 0): number => {
  const angle = LANE_ANGLE_MAP[lane];
  if (!Number.isFinite(angle)) {
    GameErrors.log(`Invalid lane ${lane}, using default angle 0`);
    return 0;
  }
  return angle + rotationOffset;
};

// Lane to color mapping with health-based desaturation
export const getColorForLane = (lane: number, health: number = MAX_HEALTH): string => {
  const baseColor = (() => {
    switch (lane) {
      case -1: return '#00FF00'; // Q - green
      case -2: return '#FF0000'; // P - red
      case 0: return '#FF6600'; // W - neon orange (was pink #FF007F)
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
