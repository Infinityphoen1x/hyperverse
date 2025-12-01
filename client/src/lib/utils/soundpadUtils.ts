// src/utils/soundpadUtils.ts
import { HEXAGON_RADII } from '@/lib/config/gameConstants';

export const calculateButtonPosition = (angle: number, vpX: number, vpY: number): { cx: number; cy: number } => {
  const outerHexagonRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  const rad = (angle * Math.PI) / 180;
  const cx = vpX + Math.cos(rad) * outerHexagonRadius;
  const cy = vpY + Math.sin(rad) * outerHexagonRadius;
  return { cx, cy };
};