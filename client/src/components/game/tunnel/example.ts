// src/components/game/tunnel/ParallaxHexagonLayers.tsx
import React, { memo, useEffect, useRef, useCallback } from 'react';
import { HEXAGON_RADII } from '@/lib/config';

interface ParallaxHexagonLayersProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  rotationOffset?: number;
  beatAmplitude?: number; // New: For rhythm sync (0-1 scale)
}

const BASE_PARALLAX_DELAY_MS = 300; // Reduced base for snappier feel
const PARALLAX_ROTATION_BASE_SCALE = 1.5; // Base multiplier
const INTERPOLATION_DURATION_MS = 200; // Smooth lerp time after delay

const ParallaxHexagonLayersComponent = ({ 
  rayColor, 
  vpX, 
  vpY, 
  hexCenterX, 
  hexCenterY, 
  rotationOffset = 0,
  beatAmplitude = 0 // Default idle
}: ParallaxHexagonLayersProps) => {
  // Current animated values (start at props)
  const currentVpXRef = useRef(vpX);
  const currentVpYRef = useRef(vpY);
  const currentHexCenterXRef = useRef(hexCenterX);
  const currentHexCenterYRef = useRef(hexCenterY);
  const currentRotationRef = useRef(rotationOffset);
  
  // Target queue with timestamps
  const targetQueueRef = useRef<{vpX: number, vpY: number, hexCenterX: number, hexCenterY: number, rotation: number, timestamp: number}[]>([]);
  
  // Animation refs
  const animationRef = useRef<number | null>(null);
  const interpolationStartRef = useRef<{time: number, from: {vpX: number, vpY: number, hexCenterX: number, hexCenterY: number, rotation: number}} | null>(null);

  // Queue new targets: Delay scales inversely with progress (deeper = more lag), rotation amplified
  const queueTarget = useCallback((progress: number) => {
    const depthFactor = 1 - progress; // 0 (front) to 1 (deep)
    const delay = BASE_PARALLAX_DELAY_MS * (1 + depthFactor * 2); // 300-900ms
    const timestamp = performance.now() + delay;
    const rotationScale = PARALLAX_ROTATION_BASE_SCALE * (1 + depthFactor * 0.5); // Deeper twists more
    const scaledRotation = (rotationOffset * rotationScale) * (1 + beatAmplitude); // Beat boosts
    
    targetQueueRef.current.push({ vpX, vpY, hexCenterX, hexCenterY, rotation: scaledRotation, timestamp });
  }, [vpX, vpY, hexCenterX, hexCenterY, rotationOffset, beatAmplitude]);

  // Initial queue for all layers
  useEffect(() => {
    const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
    const parallaxRadii = HEXAGON_RADII.slice(0, -1).map((radius, idx) => {
      const nextRadius = HEXAGON_RADII[idx + 1];
      return (radius + nextRadius) / 2;
    });
    
    parallaxRadii.forEach(radius => {
      const progress = radius / maxRadius;
      queueTarget(progress);
    });
  }, []); // Run once on mount

  // Re-queue on prop changes (for all layers)
  useEffect(() => {
    const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
    const parallaxRadii = HEXAGON_RADII.slice(0, -1).map((radius, idx) => {
      const nextRadius = HEXAGON_RADII[idx + 1];
      return (radius + nextRadius) / 2;
    });
    
    // Clear old queue to avoid buildup
    targetQueueRef.current = [];
    
    parallaxRadii.forEach(radius => {
      const progress = radius / maxRadius;
      queueTarget(progress);
    });
  }, [vpX, vpY, hexCenterX, hexCenterY, rotationOffset, beatAmplitude, queueTarget]);

  // Lerp helper
  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  // Animation loop: Process queue, interpolate if active
  const animate = useCallback(() => {
    const now = performance.now();
    const queue = targetQueueRef.current;
    
    // Apply next ready target (start interpolation)
    if (queue.length > 0 && queue[0].timestamp <= now) {
      const target = queue.shift()!;
      interpolationStartRef.current = {
        time: now,
        from: {
          vpX: currentVpXRef.current,
          vpY: currentVpYRef.current,
          hexCenterX: currentHexCenterXRef.current,
          hexCenterY: currentHexCenterYRef.current,
          rotation: currentRotationRef.current
        }
      };
      // Immediately set target as "end" state, but we'll lerp in render/loop
    }
    
    // If interpolating, update currents
    const interp = interpolationStartRef.current;
    if (interp) {
      const elapsed = now - interp.time;
      const t = Math.min(elapsed / INTERPOLATION_DURATION_MS, 1);
      
      if (t >= 1) {
        // Snap to end and clear
        currentVpXRef.current = vpX; // Use latest prop? Or queue's target—adjust as needed
        currentVpYRef.current = vpY;
        currentHexCenterXRef.current = hexCenterX;
        currentHexCenterYRef.current = hexCenterY;
        currentRotationRef.current = rotationOffset * PARALLAX_ROTATION_BASE_SCALE; // Simplified
        interpolationStartRef.current = null;
      } else {
        // Lerp
        currentVpXRef.current = lerp(interp.from.vpX, vpX, t);
        currentVpYRef.current = lerp(interp.from.vpY, vpY, t);
        currentHexCenterXRef.current = lerp(interp.from.hexCenterX, hexCenterX, t);
        currentHexCenterYRef.current = lerp(interp.from.hexCenterY, hexCenterY, t);
        currentRotationRef.current = lerp(interp.from.rotation, rotationOffset * PARALLAX_ROTATION_BASE_SCALE, t);
      }
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [vpX, vpY, hexCenterX, hexCenterY, rotationOffset]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Generate parallax radii
  const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  const parallaxRadii = HEXAGON_RADII.slice(0, -1).map((radius, idx) => {
    const nextRadius = HEXAGON_RADII[idx + 1];
    return (radius + nextRadius) / 2;
  });

  return (
    <>
      {parallaxRadii.map((radius, idx) => {
        const progress = radius / maxRadius;
        
        // Calculate vertices using *current* animated values
        const points = Array.from({ length: 6 }).map((_, i) => {
          const angle = ((i * 60 + currentRotationRef.current) * Math.PI) / 180;
          const outerCornerX = currentHexCenterXRef.current + maxRadius * Math.cos(angle);
          const outerCornerY = currentHexCenterYRef.current + maxRadius * Math.sin(angle);
          
          const x = currentVpXRef.current + (outerCornerX - currentVpXRef.current) * progress;
          const y = currentVpYRef.current + (outerCornerY - currentVpYRef.current) * progress;
          
          return `${x},${y}`;
        }).join(' ');
        
        // Depth styling: Closer = brighter/thicker; add beat pulse
        const strokeWidth = 0.4 + progress * 4.0;
        const opacity = (0.05 + progress * 0.15) * (1 + beatAmplitude * 0.5);
        
        return (
          <polygon 
            key={`parallax-hexagon-${idx}`} 
            points={points} 
            fill="none" 
            stroke={rayColor} // Fixed: Use prop
            strokeWidth={strokeWidth} 
            opacity={opacity}
          />
        );
      })}
    </>
  );
};

export const ParallaxHexagonLayers = memo(ParallaxHexagonLayersComponent);