// src/components/HexagonLayers.tsx
import React from 'react';
import { HEXAGON_RADII } from '@/lib/config/gameConstants';

interface HexagonLayersProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
}

export function HexagonLayers({ rayColor, vpX, vpY, hexCenterX, hexCenterY }: HexagonLayersProps) {
  const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  return (
    <>
      {HEXAGON_RADII.map((radius, idx) => {
        const progress = radius / maxRadius;
        const centerX = idx === HEXAGON_RADII.length - 1 ? hexCenterX : vpX;
        const centerY = idx === HEXAGON_RADII.length - 1 ? hexCenterY : vpY;
        const points = Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 60 * Math.PI) / 180;
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