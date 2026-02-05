// src/utils/soundpadUtils.ts
import { HEXAGON_RADII, VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';

export const calculateButtonPosition = (angle: number, vpX: number, vpY: number, rotationOffset: number = 0, zoomScale: number = 1.0): { cx: number; cy: number } => {
  // Sanitize inputs to prevent NaN propagation
  const safeVpX = isFinite(vpX) ? vpX : VANISHING_POINT_X;
  const safeVpY = isFinite(vpY) ? vpY : VANISHING_POINT_Y;
  const safeRotation = isFinite(rotationOffset) ? rotationOffset : 0;
  const safeZoom = isFinite(zoomScale) ? zoomScale : 1.0;
  
  const outerHexagonRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1]; // 248 (unchanged)
  const buttonOffset = 30; // <- Define/tweak this offset (e.g., 20-40px) to position buttons further outward without hexagon changes
  const buttonRadius = (outerHexagonRadius + buttonOffset) * safeZoom; // Apply zoom scale
  const rad = ((angle + safeRotation) * Math.PI) / 180;
  const cx = safeVpX + Math.cos(rad) * buttonRadius;
  const cy = safeVpY + Math.sin(rad) * buttonRadius;
  
  // DEBUG: Log NaN in calculated position
  if (!isFinite(cx) || !isFinite(cy)) {
    // console.error('[calculateButtonPosition] NaN in output:', {
    //   input: { angle, vpX, vpY, rotationOffset, zoomScale },
    //   safe: { safeVpX, safeVpY, safeRotation, safeZoom },
    //   intermediate: { buttonRadius, rad },
    //   output: { cx, cy }
    // });
  }
  
  return { cx, cy };
};