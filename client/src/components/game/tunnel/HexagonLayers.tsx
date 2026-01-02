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
}

export function HexagonLayers({ rayColor, vpX, vpY, hexCenterX, hexCenterY, rotationOffset = 0, zoomIntensity = 0 }: HexagonLayersProps) {
  const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  
  return (
    <>
      {HEXAGON_RADII.map((radius, idx) => {
        const baseProgress = radius / maxRadius;
        
        // Apply zoom compression: pull inner hexagons toward outer
        const compressionFactor = 0.4;
        const progress = baseProgress + (1 - baseProgress) * zoomIntensity * compressionFactor;
        
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
        const opacity = Math.min(1, baseOpacity + glowBoost);
        
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