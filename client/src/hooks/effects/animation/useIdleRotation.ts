// src/hooks/useIdleRotation.ts
import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';

/**
 * Manages the global idle rotation animation
 * Should only be called once from the main game component
 * @param enabled Whether idle rotation is enabled
 */
export function useIdleRotationManager(enabled: boolean = true): void {
  useEffect(() => {
    // Reset rotation to 0 when disabled
    if (!enabled) {
      useGameStore.getState().setIdleRotation(0);
      return;
    }
    
    const startTime = performance.now();
    let animationRef: number | null = null;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 16; // ~60fps

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      
      // Only update if enough time has passed (throttle to 60fps max)
      if (currentTime - lastUpdate >= UPDATE_INTERVAL) {
        // Slow swaying motion: oscillate between -10° and +10° over 8 seconds
        const period = 8000; // 8 seconds for full cycle
        const amplitude = 10; // ±10 degrees
        const angle = Math.sin((elapsed / period) * 2 * Math.PI) * amplitude;
        
        useGameStore.getState().setIdleRotation(angle);
        lastUpdate = currentTime;
      }
      
      animationRef = requestAnimationFrame(animate);
    };

    animationRef = requestAnimationFrame(animate);

    return () => {
      if (animationRef !== null) {
        cancelAnimationFrame(animationRef);
      }
      // Reset rotation when unmounting
      useGameStore.getState().setIdleRotation(0);
    };
  }, [enabled]);
}

/**
 * Hook to read the current idle rotation value with depth factor
 * @param depthFactor 0-1 value where 1.0 = foreground (full speed), 0.3 = background (slow)
 */
export function useIdleRotation(depthFactor: number = 1.0): number {
  const baseRotation = useGameStore(state => state.idleRotation);
  const safeBase = isFinite(baseRotation) ? baseRotation : 0;
  const safeFactor = isFinite(depthFactor) ? depthFactor : 1.0;
  const result = safeBase * safeFactor;
  return isFinite(result) ? result : 0;
}
