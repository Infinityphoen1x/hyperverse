// src/components/game/tunnel/ParallaxHexagonLayers.tsx
import React, { memo, useEffect, useRef } from 'react';
import { HEXAGON_RADII } from '@/lib/config';

interface ParallaxHexagonLayersProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  rotationOffset?: number;
  zoomIntensity?: number; // 0-1 for zoom compression effect
  zoomScale?: number; // Scale multiplier for size increase (1.0 to 1.3)
}

const BASE_PARALLAX_DELAY_MS = 50; // Base delay for outermost layer
const PARALLAX_ROTATION_BASE_SCALE = 3.0;

const ParallaxHexagonLayersComponent = ({ 
  rayColor, 
  vpX, 
  vpY, 
  hexCenterX, 
  hexCenterY, 
  rotationOffset = 0,
  zoomIntensity = 0,
  zoomScale = 1.0
}: ParallaxHexagonLayersProps) => {
  // Store target and current values per layer for smooth interpolation
  const layerRotationsRef = useRef<{[layerIndex: number]: {current: number, target: number, targetTime: number}}>({}); 
  const animationRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);

  // Generate parallax radii (between main hexagon layers + one beyond outermost)
  const parallaxRadii = HEXAGON_RADII.slice(0, -1).map((radius, idx) => {
    const nextRadius = HEXAGON_RADII[idx + 1];
    return (radius + nextRadius) / 2;
  });
  
  // Add one more layer beyond the outermost tunnel hexagon
  const outermost = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  const extraRadius = outermost + (outermost - HEXAGON_RADII[HEXAGON_RADII.length - 2]) * 0.75;
  parallaxRadii.push(extraRadius);

  // Delayed zoom intensity (300ms delay to match parallax)
  const delayedZoomRef = useRef(0);
  const delayedScaleRef = useRef(1.0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      delayedZoomRef.current = zoomIntensity;
      delayedScaleRef.current = zoomScale;
    }, 300);
    return () => clearTimeout(timer);
  }, [zoomIntensity, zoomScale]);
  
  const baseMaxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  
  // Initialize all layers
  useEffect(() => {
    parallaxRadii.forEach((_, idx) => {
      if (!layerRotationsRef.current[idx]) {
        layerRotationsRef.current[idx] = {current: rotationOffset, target: rotationOffset, targetTime: 0};
      }
    });
  }, []);

  // Update targets when rotation changes
  useEffect(() => {
    const now = performance.now();
    
    parallaxRadii.forEach((radius, idx) => {
      const maxRadius = baseMaxRadius * delayedScaleRef.current;
      const progress = radius / maxRadius;
      const depthFactor = progress; // 0 (near/inner) to 1 (far/outer)
      const delay = BASE_PARALLAX_DELAY_MS * (1 + (1 - depthFactor) * 4); // 50-250ms (outer = less delay, inner = more delay)
      const rotationScale = PARALLAX_ROTATION_BASE_SCALE * (1 + depthFactor * 1.0); // Outer rotates MORE (3.0x-6.0x)
      const scaledRotation = rotationOffset * rotationScale;
      
      if (!layerRotationsRef.current[idx]) {
        layerRotationsRef.current[idx] = {current: scaledRotation, target: scaledRotation, targetTime: now + delay};
      } else {
        layerRotationsRef.current[idx].target = scaledRotation;
        layerRotationsRef.current[idx].targetTime = now + delay;
      }
    });
  }, [rotationOffset, parallaxRadii, baseMaxRadius, delayedScaleRef]);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const now = performance.now();
      
      // Smoothly interpolate each layer toward its target (always lerping, delay just affects when target updates)
      Object.keys(layerRotationsRef.current).forEach(key => {
        const idx = parseInt(key);
        const layer = layerRotationsRef.current[idx];
        
        // Always lerp toward target for smooth motion
        const diff = layer.target - layer.current;
        layer.current += diff * 0.3; // Increased from 0.15 for more responsiveness
      });
      
      frameCountRef.current++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);
  
  // Use frame count to force re-renders
  const _ = frameCountRef.current;
  
  return (
    <>
      {parallaxRadii.map((radius, idx) => {
        // Only scale outermost parallax layer (last index)
        const isOutermost = idx === parallaxRadii.length - 1;
        const scaledRadius = isOutermost ? radius * delayedScaleRef.current : radius;
        const maxRadius = baseMaxRadius * delayedScaleRef.current;
        
        const baseProgress = scaledRadius / maxRadius;
        
        // Don't apply compression - use base progress directly
        const progress = baseProgress;
        
        // Get this layer's smoothly interpolated rotation
        const layerRotation = layerRotationsRef.current[idx]?.current ?? 0;
        
        // Calculate vertices
        const points = Array.from({ length: 6 }).map((_, i) => {
          const angle = ((i * 60 + layerRotation) * Math.PI) / 180;
          const outerCornerX = hexCenterX + maxRadius * Math.cos(angle);
          const outerCornerY = hexCenterY + maxRadius * Math.sin(angle);
          
          const x = vpX + (outerCornerX - vpX) * progress;
          const y = vpY + (outerCornerY - vpY) * progress;
          
          return `${x},${y}`;
        }).join(' ');
        
        // Depth styling
        const strokeWidth = 0.4 + progress * 4.0;
        const baseOpacity = 0.03 + progress * 0.17;
        
        // Enhance opacity during ZOOM (with delayed intensity)
        const glowBoost = delayedZoomRef.current * 0.2;
        const opacity = Math.min(0.3, baseOpacity + glowBoost);
        
        return (
          <g key={`parallax-layer-${idx}`}>
            <polygon 
              points={points} 
              fill="none" 
              stroke="#FF007F"
              strokeWidth={strokeWidth} 
              opacity={opacity}
            />
            {/* Rays connecting this layer to the next parallax layer (skip for last layer) */}
            {idx < parallaxRadii.length - 1 && Array.from({ length: 6 }).map((_, cornerIdx) => {
              const angle = ((cornerIdx * 60 + layerRotation) * Math.PI) / 180;
              const outerCornerX = hexCenterX + maxRadius * Math.cos(angle);
              const outerCornerY = hexCenterY + maxRadius * Math.sin(angle);
              
              // Current layer corner
              const x1 = vpX + (outerCornerX - vpX) * progress;
              const y1 = vpY + (outerCornerY - vpY) * progress;
              
              // Next layer corner
              const nextProgress = parallaxRadii[idx + 1] / maxRadius;
              const nextLayerRotation = layerRotationsRef.current[idx + 1]?.current ?? layerRotation;
              const nextAngle = ((cornerIdx * 60 + nextLayerRotation) * Math.PI) / 180;
              const nextOuterCornerX = hexCenterX + maxRadius * Math.cos(nextAngle);
              const nextOuterCornerY = hexCenterY + maxRadius * Math.sin(nextAngle);
              const x2 = vpX + (nextOuterCornerX - vpX) * nextProgress;
              const y2 = vpY + (nextOuterCornerY - vpY) * nextProgress;
              
              return (
                <line
                  key={`ray-parallax-${idx}-${cornerIdx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF007F"
                  strokeWidth={strokeWidth * 0.8}
                  opacity={opacity * 0.7}
                />
              );
            })}
            {/* Rays connecting each parallax layer to its corresponding tunnel hexagon vertices */}
            {Array.from({ length: 6 }).map((_, cornerIdx) => {
              const angle = ((cornerIdx * 60 + layerRotation) * Math.PI) / 180;
              const outerCornerX = hexCenterX + maxRadius * Math.cos(angle);
              const outerCornerY = hexCenterY + maxRadius * Math.sin(angle);
              
              // Parallax layer corner
              const x1 = vpX + (outerCornerX - vpX) * progress;
              const y1 = vpY + (outerCornerY - vpY) * progress;
              
              // Find corresponding tunnel hexagon (match by index if possible, or closest)
              const tunnelIdx = Math.min(idx, HEXAGON_RADII.length - 1);
              const tunnelRadius = HEXAGON_RADII[tunnelIdx];
              const tunnelProgress = tunnelRadius / maxRadius;
              
              // Calculate corresponding tunnel hexagon vertex
              const tunnelAngle = ((cornerIdx * 60 + rotationOffset) * Math.PI) / 180;
              const tunnelOuterCornerX = hexCenterX + maxRadius * Math.cos(tunnelAngle);
              const tunnelOuterCornerY = hexCenterY + maxRadius * Math.sin(tunnelAngle);
              const x2 = vpX + (tunnelOuterCornerX - vpX) * tunnelProgress;
              const y2 = vpY + (tunnelOuterCornerY - vpY) * tunnelProgress;
              
              return (
                <line
                  key={`ray-to-tunnel-${idx}-${cornerIdx}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF007F"
                  strokeWidth={strokeWidth * 0.8}
                  opacity={opacity * 0.8}
                />
              );
            })}
          </g>
        );
      })}
    </>
  );
};

export const ParallaxHexagonLayers = memo(ParallaxHexagonLayersComponent);
