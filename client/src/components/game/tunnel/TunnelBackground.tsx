import React from 'react';
import { VANISHING_POINT_X, VANISHING_POINT_Y, HEXAGON_RADII, RAY_ANGLES, TUNNEL_MAX_DISTANCE, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, MAX_HEALTH } from '@/lib/config/gameConstants';

interface TunnelBackgroundProps {
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  health: number;
}

const getHealthBasedRayColor = (health: number): string => {
  const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH;
  const r = Math.round(0 + (255 - 0) * healthFactor);
  const g = Math.round(255 * (1 - healthFactor));
  const b = Math.round(255 * (1 - healthFactor));
  return `rgba(${r},${g},${b},1)`;
};

export function TunnelBackground({ vpX, vpY, hexCenterX, hexCenterY, health }: TunnelBackgroundProps) {
  const rayColor = getHealthBasedRayColor(health);
  const maxRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];

  return (
    <div className="relative" style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, margin: '0 auto' }}>
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1 }}>
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
            <polygon key={`tunnel-hexagon-${idx}`} points={points} fill="none" stroke={rayColor} strokeWidth={strokeWidth} opacity={opacity} />
          );
        })}

        <circle cx={vpX} cy={vpY} r="6" fill="rgba(0,255,255,0.05)" />

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
                  <line key={`segment-${angle}-${segIdx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={rayColor} strokeWidth={strokeWidth} opacity={opacity} strokeLinecap="round" />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
