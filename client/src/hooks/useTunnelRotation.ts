// src/hooks/useTunnelRotation.ts
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useIdleRotation } from './useIdleRotation';

/**
 * Hook that provides smoothly animated tunnel rotation
 * Combines gameplay-driven rotation with idle sway animation
 * Interpolates between rotation changes over 1.5s with ease-in-out
 * Handles shortest rotation path and prevents animation stacking
 * Animation state is shared globally via Zustand store
 * @param depthFactor 0-1 value for idle rotation scaling (1.0 = foreground, 0.3 = background)
 */
export function useTunnelRotation(depthFactor: number = 1.0): number {
  const targetRotation = useGameStore(state => state.tunnelRotation);
  const animatedRotation = useGameStore(state => state.animatedTunnelRotation);
  const setAnimatedRotation = useGameStore(state => state.setAnimatedTunnelRotation);
  const animationRef = useRef<number | null>(null);
  const startRotationRef = useRef(animatedRotation);
  const startTimeRef = useRef(0);
  
  // Get idle rotation sway animation with depth factor
  const idleRotation = useIdleRotation(depthFactor);
  
  useEffect(() => {
    // Get current animated value at effect start
    const currentAnimated = animatedRotation;
    
    // If already at target, no animation needed
    if (currentAnimated === targetRotation) {
      return;
    }
    
    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Calculate shortest rotation path
    const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
    const start = normalizeAngle(currentAnimated);
    const target = normalizeAngle(targetRotation);
    
    // Find shortest path (might go through 0°/360° boundary)
    let delta = target - start;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    const finalTarget = start + delta;
    
    startRotationRef.current = currentAnimated;
    startTimeRef.current = performance.now();
    const duration = 1500; // 1.5 seconds
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out cubic)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      const currentRotation = startRotationRef.current + (finalTarget - startRotationRef.current) * eased;
      setAnimatedRotation(currentRotation);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to exact target at end to avoid floating point drift
        setAnimatedRotation(targetRotation);
        animationRef.current = null;
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetRotation, setAnimatedRotation]); // Remove animatedRotation from dependencies!
  
  // Combine gameplay rotation with idle sway
  return animatedRotation + idleRotation;
}
