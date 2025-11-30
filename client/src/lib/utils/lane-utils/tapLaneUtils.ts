// src/lib/utils/laneUtils.ts
import { GameErrors } from '@/lib/errors/errorLog';

export const getLaneAngle = (lane: number): number => {
  const rayMapping: Record<number, number> = {
    [-2]: 0,
    [-1]: 180,
    [0]: 120,
    [1]: 60,
    [2]: 300,
    [3]: 240,
  };
  const angle = rayMapping[lane];
  if (!Number.isFinite(angle)) {
    GameErrors.log(`Down3DNoteLane: Invalid lane ${lane}, using default angle 0`);
    return 0;
  }
  return angle;
};

export const getColorForLane = (lane: number): string => {
  // Placeholder implementation - replace with actual color mapping logic
  const colorMapping: Record<number, string> = {
    [-2]: '#ff0000',
    [-1]: '#00ff00',
    [0]: '#0000ff',
    [1]: '#ffff00',
    [2]: '#ff00ff',
    [3]: '#00ffff',
  };
  return colorMapping[lane] || '#ffffff';
};