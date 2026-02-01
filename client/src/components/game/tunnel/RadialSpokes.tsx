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
  zoomScale?: number; // Scale multiplier for size increase (1.0 to 1.3)
}

const RadialSpokesComponent = ({ rayColor, vpX, vpY, hexCenterX, hexCenterY, rotationOffset = 0, zoomIntensity = 0, zoomScale = 1.0 }: RadialSpokesProps) => {
  // DEBUG: Log input props
  if (!isFinite(vpX) || !isFinite(vpY) || !isFinite(hexCenterX) || !isFinite(hexCenterY) || !isFinite(rotationOffset)) {
    console.error('[RadialSpokes] NaN in props:', { vpX, vpY, hexCenterX, hexCenterY, rotationOffset, zoomIntensity, zoomScale });
  }
  
  // Safety check for NaN values using isFinite (handles undefined, NaN, Infinity)
  const safeVpX = isFinite(vpX) ? vpX : 350;
  const safeVpY = isFinite(vpY) ? vpY : 300;
  const safeHexCenterX = isFinite(hexCenterX) ? hexCenterX : 350;
  const safeHexCenterY = isFinite(hexCenterY) ? hexCenterY : 300;
  const safeRotationOffset = isFinite(rotationOffset) ? rotationOffset : 0;
  const safeZoomScale = isFinite(zoomScale) ? zoomScale : 1.0;
  
  const maxRadius = TUNNEL_MAX_DISTANCE * safeZoomScale; // Apply zoom scale
  return (
    <>
      {RAY_ANGLES.map((angle: number) => {
        // Add rotation offset to ray angle
        const rad = ((angle + safeRotationOffset) * Math.PI) / 180;
        const cornerX = safeHexCenterX + maxRadius * Math.cos(rad);
        const cornerY = safeHexCenterY + maxRadius * Math.sin(rad);
        return (
          <g key={`spoke-group-${angle}`} data-testid={`spoke-${angle}`}>
            {Array.from({ length: 12 }).map((_, segIdx) => {
              const segProgress = (segIdx + 1) / 12;
              const x1 = safeVpX + (cornerX - safeVpX) * (segProgress - 1 / 12);
              const y1 = safeVpY + (cornerY - safeVpY) * (segProgress - 1 / 12);
              const x2 = safeVpX + (cornerX - safeVpX) * segProgress;
              const y2 = safeVpY + (cornerY - safeVpY) * segProgress;
              
              // DEBUG: Check for NaN in radial spoke coordinates
              if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
                console.error('[RadialSpokes segment] NaN detected:', {
                  angle,
                  segIdx,
                  segProgress,
                  cornerX, cornerY,
                  safeVpX, safeVpY,
                  x1, y1, x2, y2
                });
              }
              
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