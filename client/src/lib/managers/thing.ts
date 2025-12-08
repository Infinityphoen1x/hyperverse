// src/components/game/tunnel/ParallaxHexagonLayers.tsx
import React, { memo, useEffect, useRef, useCallback } from 'react';
import { HEXAGON_RADII } from '@/lib/config';
import { RotationState } from '@/lib/engine/RotationManager'; // Adjust path as needed

interface ParallaxHexagonLayersProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  rotationStateA?: RotationState; // Deck A state
  rotationStateB?: RotationState; // Deck B state
  beatAmplitude?: number; // 0-1; pulse on hits
  rotationDurationMS?: number; // Optional: Custom lerp duration for rotations
}

const BASE_PARALLAX_DELAY_MS = 300;
const PARALLAX_ROTATION_BASE_SCALE = 1.5;
const INTERPOLATION_DURATION_MS = 200;
const DEFAULT_ROTATION_DURATION_MS = 300; // Fallback for rotation lerps

const ParallaxHexagonLayersComponent: React.FC<ParallaxHexagonLayersProps> = ({
  rayColor,
  vpX,
  vpY,
  hexCenterX,
  hexCenterY,
  rotationStateA,
  rotationStateB,
  beatAmplitude = 0,
  rotationDurationMS = DEFAULT_ROTATION_DURATION_MS,
}) => {
  // Current animated values (start at props)
  const currentVpXRef = useRef(vpX);
  const currentVpYRef = useRef(vpY);
  const currentHexCenterXRef = useRef(hexCenterX);
  const currentHexCenterYRef = useRef(hexCenterY);
  const currentRotationRef = useRef(0); // Start at neutral

  // Track last known angles for lerping (per deck)
  const lastAngleARef = useRef(0);
  const lastAngleBRef = useRef(0);

  // Target queue with timestamps
  const targetQueueRef = useRef<{vpX: number, vpY: number, hexCenterX: number, hexCenterY: number, rotation: number, timestamp: number}[]>([]);

  // Animation refs
  const animationRef = useRef<number | null>(null);
  const interpolationStartRef = useRef<{time: number, from: {vpX: number, vpY: number, hexCenterX: number, hexCenterY: number, rotation: number}} | null>(null);

  // Compute blended target rotation from manager states
  const getBlendedTargetRotation = useCallback((now: number): number => {
    let targetA = 0;
    let targetB = 0;

    if (rotationStateA?.status === 'rotating') {
      const elapsedA = now - rotationStateA.rotationStartTime;
      const tA = Math.min(elapsedA / rotationDurationMS, 1);
      targetA = lastAngleARef.current + (rotationStateA.targetAngle - lastAngleARef.current) * tA; // Lerp per deck
      if (tA >= 1) lastAngleARef.current = rotationStateA.targetAngle; // Update last
    } else if (rotationStateA?.status === 'settled') {
      targetA = rotationStateA.targetAngle || 0;
    }

    if (rotationStateB?.status === 'rotating') {
      const elapsedB = now - rotationStateB.rotationStartTime;
      const tB = Math.min(elapsedB / rotationDurationMS, 1);
      targetB = lastAngleBRef.current + (rotationStateB.targetAngle - lastAngleBRef.current) * tB;
      if (tB >= 1) lastAngleBRef.current = rotationStateB.targetAngle;
    } else if (rotationStateB?.status === 'settled') {
      targetB = rotationStateB.targetAngle || 0;
    }

    return (targetA + targetB) / 2; // Blend for unified tunnel rotation
  }, [rotationStateA, rotationStateB, rotationDurationMS]);

  // Queue new targets: Delay scales inversely with progress, rotation from blended target
  const queueTarget = useCallback((progress: number) => {
    const now = performance.now();
    const blendedRotation = getBlendedTargetRotation(now);
    const depthFactor = 1 - progress;
    const delay = BASE_PARALLAX_DELAY_MS * (1 + depthFactor * 2);
    const timestamp = now + delay;
    const rotationScale = PARALLAX_ROTATION_BASE_SCALE * (1 + depthFactor * 0.5);
    const scaledRotation = (blendedRotation * rotationScale) * (1 + beatAmplitude);

    targetQueueRef.current.push({ vpX, vpY, hexCenterX, hexCenterY, rotation: scaledRotation, timestamp });
  }, [vpX, vpY, hexCenterX, hexCenterY, beatAmplitude, getBlendedTargetRotation]);

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
  }, [queueTarget]); // Depend on queueTarget

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
  }, [vpX, vpY, hexCenterX, hexCenterY, beatAmplitude, queueTarget]);

  // Lerp helper
  const lerp = useCallback((start: number, end: number, t: number) => start + (end - start) * t, []);

  // Animation loop: Process queue, interpolate if active, update rotation from managers
  const animate = useCallback(() => {
    const now = performance.now();
    const queue = targetQueueRef.current;

    // Update current rotation from blended manager states
    const blendedTarget = getBlendedTargetRotation(now);
    currentRotationRef.current = lerp(currentRotationRef.current, blendedTarget, 0.1); // Smooth follow

    // Apply next ready target (start interpolation for parallax)
    if (queue.length > 0 && queue[0].timestamp <= now) {
      const target = queue.shift()!;
      interpolationStartRef.current = {
        time: now,
        from: {
          vpX: currentVpXRef.current,
          vpY: currentVpYRef.current,
          hexCenterX: currentHexCenterXRef.current,
          hexCenterY: currentHexCenterYRef.current,
          rotation: currentRotationRef.current // Use current blended
        }
      };
    }

    // If interpolating, update currents
    const interp = interpolationStartRef.current;
    if (interp) {
      const elapsed = now - interp.time;
      const t = Math.min(elapsed / INTERPOLATION_DURATION_MS, 1);

      if (t >= 1) {
        // Snap to end and clear
        currentVpXRef.current = vpX;
        currentVpYRef.current = vpY;
        currentHexCenterXRef.current = hexCenterX;
        currentHexCenterYRef.current = hexCenterY;
        interpolationStartRef.current = null;
      } else {
        // Lerp
        currentVpXRef.current = lerp(interp.from.vpX, vpX, t);
        currentVpYRef.current = lerp(interp.from.vpY, vpY, t);
        currentHexCenterXRef.current = lerp(interp.from.hexCenterX, hexCenterX, t);
        currentHexCenterYRef.current = lerp(interp.from.hexCenterY, hexCenterY, t);
        // Rotation handled separately via managers
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [vpX, vpY, hexCenterX, hexCenterY, getBlendedTargetRotation, lerp]);

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
            stroke={rayColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        );
      })}
    </>
  );
};

export const ParallaxHexagonLayers = memo(ParallaxHexagonLayersComponent);