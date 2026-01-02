// src/components/RadialSpokes.tsx
import React, { memo } from 'react';
import { RAY_ANGLES, TUNNEL_MAX_DISTANCE } from '@/lib/config';

interface RadialSpokesProps {
  rayColor: string;
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  rotationOffset?: number; // Rotation offset in degrees
  zoomIntensity?: number; // 0-1 for zoom glow effect
}

const RadialSpokesComponent = ({ rayColor, vpX, vpY, hexCenterX, hexCenterY, rotationOffset = 0, zoomIntensity = 0 }: RadialSpokesProps) => {
  const maxRadius = TUNNEL_MAX_DISTANCE;
  return (
    <>
      {RAY_ANGLES.map((angle: number) => {
        // Add rotation offset to ray angle
        const rad = ((angle + rotationOffset) * Math.PI) / 180;
        const cornerX = hexCenterX + maxRadius * Math.cos(rad);
        const cornerY = hexCenterY + maxRadius * Math.sin(rad);
        return (
          <g key={`spoke-group-${angle}`} data-testid={`spoke-${angle}`}>
            {Array.from({ length: 12 }).map((_, segIdx) => {
              const segProgress = (segIdx + 1) / 12;
              const x1 = vpX + (cornerX - vpX) * (segProgress - 1 / 12);
              const y1 = vpY + (cornerY - vpY) * (segProgress - 1 / 12);
              const x2 = vpX + (cornerX - vpX) * segProgress;
              const y2 = vpY + (cornerY - vpY) * segProgress;
              const strokeWidth = 0.3 + segProgress * 3.5;
              const baseOpacity = 0.1 + segProgress * 0.4;
              
              // Enhance opacity during ZOOM
              const glowBoost = zoomIntensity * 0.25;
              const opacity = Math.min(0.8, baseOpacity + glowBoost);
              return (
                <line 
                  key={`segment-${angle}-${segIdx}`} 
                  data-testid={`segment-${angle}-${segIdx}`}
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
};

export const RadialSpokes = memo(RadialSpokesComponent);