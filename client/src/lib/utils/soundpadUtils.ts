// src/utils/soundpadUtils.ts
import { HEXAGON_RADII } from '@/lib/config';

export const calculateButtonPosition = (angle: number, vpX: number, vpY: number, rotationOffset: number = 0, zoomScale: number = 1.0): { cx: number; cy: number } => {
  const outerHexagonRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1]; // 248 (unchanged)
  const buttonOffset = 30; // <- Define/tweak this offset (e.g., 20-40px) to position buttons further outward without hexagon changes
  const buttonRadius = (outerHexagonRadius + buttonOffset) * zoomScale; // Apply zoom scale
  const rad = ((angle + rotationOffset) * Math.PI) / 180;
  const cx = vpX + Math.cos(rad) * buttonRadius;
  const cy = vpY + Math.sin(rad) * buttonRadius;
  return { cx, cy };
};