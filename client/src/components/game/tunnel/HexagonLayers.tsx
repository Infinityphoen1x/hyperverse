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
}

export function HexagonLayers({ rayColor, vpX, vpY, hexCenterX, hexCenterY, rotationOffset = 0 }: HexagonLayersProps) {
  const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  return (
    <>
      {HEXAGON_RADII.map((radius, idx) => {
        const progress = radius / maxRadius;
        const centerX = idx === HEXAGON_RADII.length - 1 ? hexCenterX : vpX;
        const centerY = idx === HEXAGON_RADII.length - 1 ? hexCenterY : vpY;
        const points = Array.from({ length: 6 }).map((_, i) => {
          // Add rotation offset to base angle
          const angle = ((i * 60 + rotationOffset) * Math.PI) / 180;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          return `${x},${y}`;
        }).join(' ');
        const strokeWidth = 0.3 + progress * 3.5;
        const opacity = 0.08 + progress * 0.22;
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