/**
 * Safe vanishing point hook
 * Ensures vanishing point coordinates are valid numbers, falling back to defaults
 * Used by both editor and game to prevent NaN rendering issues
 */
import { useMemo } from 'react';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';

interface VanishingPointCoordinates {
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
}

interface SafeVanishingPointInput {
  vpX?: number;
  vpY?: number;
  hexCenterX?: number;
  hexCenterY?: number;
}

/**
 * Validates and sanitizes vanishing point coordinates
 * @param input - Potentially unsafe VP coordinates
 * @returns Safe VP coordinates with NaN values replaced by defaults
 */
export function useSafeVanishingPoint(input: SafeVanishingPointInput): VanishingPointCoordinates {
  return useMemo(() => {
    const result = {
      vpX: isFinite(input.vpX ?? NaN) ? input.vpX! : VANISHING_POINT_X,
      vpY: isFinite(input.vpY ?? NaN) ? input.vpY! : VANISHING_POINT_Y,
      hexCenterX: isFinite(input.hexCenterX ?? NaN) ? input.hexCenterX! : VANISHING_POINT_X,
      hexCenterY: isFinite(input.hexCenterY ?? NaN) ? input.hexCenterY! : VANISHING_POINT_Y,
    };
    
    // DEBUG: Log when sanitization occurs
    const hadNaN = 
      !isFinite(input.vpX ?? NaN) || 
      !isFinite(input.vpY ?? NaN) || 
      !isFinite(input.hexCenterX ?? NaN) || 
      !isFinite(input.hexCenterY ?? NaN);
    if (hadNaN) {
      // console.warn('[useSafeVanishingPoint] Sanitized NaN values:', {
      //   input,
      //   output: result
      // });
    }
    
    return result;
  }, [input.vpX, input.vpY, input.hexCenterX, input.hexCenterY]);
}

/**
 * Utility function for non-hook contexts
 * Validates a single coordinate value
 */
export function sanitizeCoordinate(value: number | undefined, fallback: number): number {
  return isFinite(value ?? NaN) ? value! : fallback;
}
