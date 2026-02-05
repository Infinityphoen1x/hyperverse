// src/components/HexagonLayers.tsx
import React from 'react';
import { HEXAGON_RADII } from '@/lib/config';

interface HexagonLayersProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  rotationOffset?: number; // Rotation offset in degrees
  zoomIntensity?: number; // 0-1 for zoom compression effect
  zoomScale?: number; // Scale multiplier for size increase (1.0 to 1.3)
}

export function HexagonLayers({ rayColor, vpX, vpY, hexCenterX, hexCenterY, rotationOffset = 0, zoomIntensity = 0, zoomScale = 1.0 }: HexagonLayersProps) {
  // DEBUG: Log input props
  if (!isFinite(vpX) || !isFinite(vpY) || !isFinite(hexCenterX) || !isFinite(hexCenterY)) {
    // console.error('[HexagonLayers] NaN in props:', { vpX, vpY, hexCenterX, hexCenterY, rotationOffset, zoomIntensity, zoomScale });
  }
  
  // Safety check for NaN values using isFinite (handles undefined, NaN, Infinity)
  const safeVpX = isFinite(vpX) ? vpX : 350;
  const safeVpY = isFinite(vpY) ? vpY : 300;
  const safeHexCenterX = isFinite(hexCenterX) ? hexCenterX : 350;
  const safeHexCenterY = isFinite(hexCenterY) ? hexCenterY : 300;
  const safeRotationOffset = isFinite(rotationOffset) ? rotationOffset : 0;
  const safeZoomScale = isFinite(zoomScale) ? zoomScale : 1.0;
  
  const baseMaxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  
  // Apply ease-out cubic to zoom intensity for smoother appearance
  const easedIntensity = 1 - Math.pow(1 - zoomIntensity, 3);
  
  // During zoom, add additional smaller hexagons approaching the vanishing point
  const additionalHexagons = Math.floor(easedIntensity * 4); // Gradually add up to 4 hexagons as zoom increases
  
  const allRadii = React.useMemo(() => {
    if (additionalHexagons === 0) return HEXAGON_RADII;
    
    // Create hexagons with spacing that compresses toward vanishing point
    const totalHexagons = HEXAGON_RADII.length + additionalHexagons;
    const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1]; // 248
    
    // Use exponential spacing for more dramatic depth compression
    const newRadii: number[] = [];
    for (let i = 0; i < totalHexagons; i++) {
      // Exponential curve creates tighter spacing near vanishing point
      const linearProgress = (i + 1) / totalHexagons;
      const exponentialProgress = Math.pow(linearProgress, 1.5); // Compress spacing toward VP
      const radius = maxRadius * exponentialProgress;
      newRadii.push(radius);
    }
    
    return newRadii;
  }, [additionalHexagons]);
  
  return (
    <>
      {allRadii.map((radius, idx) => {
        // Apply scale to all hexagon layers for proportional zoom
        const scaledRadius = radius * safeZoomScale;
        const maxRadius = baseMaxRadius * safeZoomScale;
        
        const baseProgress = scaledRadius / maxRadius;
        
        // Don't apply compression - use base progress directly
        const progress = baseProgress;
        
        // Calculate vertices along the rays from VP to outer hexagon corners
        const points = Array.from({ length: 6 }).map((_, i) => {
          // Calculate fixed outer corner position (with rotation)
          const angle = ((i * 60 + safeRotationOffset) * Math.PI) / 180;
          const outerCornerX = safeHexCenterX + maxRadius * Math.cos(angle);
          const outerCornerY = safeHexCenterY + maxRadius * Math.sin(angle);
          
          // Position vertex along ray from VP to outer corner at this radius distance
          const x = safeVpX + (outerCornerX - safeVpX) * progress;
          const y = safeVpY + (outerCornerY - safeVpY) * progress;
          
          // DEBUG: Check for NaN in hexagon points
          if (!isFinite(x) || !isFinite(y)) {
            // console.error('[HexagonLayers point] NaN detected:', {
            //   layerIdx: idx,
            //   vertexIdx: i,
            //   radius,
            //   scaledRadius,
            //   progress,
            //   angle,
            //   outerCornerX, outerCornerY,
            //   safeVpX, safeVpY,
            //   x, y
            // });
          }
          
          return `${x},${y}`;
        }).join(' ');
        
        const strokeWidth = 0.3 + progress * 3.5;
        const baseOpacity = 0.2 + progress * 0.5;
        
        // Enhance opacity during ZOOM
        const glowBoost = zoomIntensity * 0.3;
        let opacity = Math.min(1, baseOpacity + glowBoost);
        
        // Gradually fade in additional hexagons based on zoom intensity and their depth
        const isAdditionalHexagon = idx < additionalHexagons;
        if (isAdditionalHexagon) {
          // Fade in based on both eased zoom intensity and hexagon index (farther = appear first)
          const depthFactor = (idx + 1) / (additionalHexagons + 1); // 0 to 1
          const visibilityThreshold = 1 - depthFactor; // Closer hexagons need more zoom
          const linearFadeAmount = Math.max(0, (easedIntensity - visibilityThreshold) / (1 - visibilityThreshold));
          
          // Apply ease-out cubic for smoother fade-in (same as rotation/scale)
          const fadeAmount = 1 - Math.pow(1 - linearFadeAmount, 3);
          opacity *= fadeAmount;
        }
        
        return (
          <polygon 
            key={`tunnel-hexagon-${idx}`} 
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
}