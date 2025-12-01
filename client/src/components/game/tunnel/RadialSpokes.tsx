// src/components/RadialSpokes.tsx
import React from 'react';
import { RAY_ANGLES, TUNNEL_MAX_DISTANCE } from '@/lib/config/gameConstants';

interface RadialSpokesProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
}

export function RadialSpokes({ rayColor, vpX, vpY, hexCenterX, hexCenterY }: RadialSpokesProps) {
  const maxRadius = TUNNEL_MAX_DISTANCE; // Assuming TUNNEL_MAX_DISTANCE for spoke length
  return (
    <>
      {RAY_ANGLES.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const cornerX = hexCenterX + maxRadius * Math.cos(rad);
        const cornerY = hexCenterY + maxRadius * Math.sin(rad);
        return (
          <g key={`spoke-group-${angle}`}>
            {Array.from({ length: 12 }).map((_, segIdx) => {
              const segProgress = (segIdx + 1) / 12;
              const x1 = vpX + (cornerX - vpX) * (segProgress - 1 / 12);
              const y1 = vpY + (cornerY - vpY) * (segProgress - 1 / 12);
              const x2 = vpX + (cornerX - vpX) * segProgress;
              const y2 = vpY + (cornerY - vpY) * segProgress;
              const strokeWidth = 0.3 + segProgress * 3.5;
              const opacity = 0.1 + segProgress * 0.4;
              return (
                <line 
                  key={`segment-${angle}-${segIdx}`} 
                  x1={x1} 
                  y1={y1} 
                  x2={x2} 
                  y2={y2} 
                  stroke={rayColor} 
                  strokeWidth={strokeWidth} 
                  opacity={opacity} 
                  strokeLinecap="round" 
                />
              );
            })}
          </g>
        );
      })}
    </>
  );
}