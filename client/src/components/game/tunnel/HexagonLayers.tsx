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
        const scaledRadius = radius * zoomScale;
        const maxRadius = baseMaxRadius * zoomScale;
        
        const baseProgress = scaledRadius / maxRadius;
        
        // Don't apply compression - use base progress directly
        const progress = baseProgress;
        
        // Calculate vertices along the rays from VP to outer hexagon corners
        const points = Array.from({ length: 6 }).map((_, i) => {
          // Calculate fixed outer corner position (with rotation)
          const angle = ((i * 60 + rotationOffset) * Math.PI) / 180;
          const outerCornerX = hexCenterX + maxRadius * Math.cos(angle);
          const outerCornerY = hexCenterY + maxRadius * Math.sin(angle);
          
          // Position vertex along ray from VP to outer corner at this radius distance
          const x = vpX + (outerCornerX - vpX) * progress;
          const y = vpY + (outerCornerY - vpY) * progress;
          
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
          const fadeAmount = Math.max(0, (easedIntensity - visibilityThreshold) / (1 - visibilityThreshold));
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