import React from 'react';
import { BUTTON_CONFIG, HEXAGON_RADII, VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config/gameConstants';

interface SoundpadButtonsProps {
  vpX: number;
  vpY: number;
  onPadHit?: (lane: number) => void;
}

export function SoundpadButtons({ vpX, vpY, onPadHit }: SoundpadButtonsProps) {
  const outerHexagonRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1];
  
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1 }}>
      {BUTTON_CONFIG.map(({ lane, key, angle, color }) => {
        const rad = (angle * Math.PI) / 180;
        const cx = vpX + Math.cos(rad) * outerHexagonRadius;
        const cy = vpY + Math.sin(rad) * outerHexagonRadius;

        return (
          <g key={`soundpad-button-${lane}`}>
            <rect x={cx - 20} y={cy - 20} width="40" height="40" fill={color} stroke={color} strokeWidth="2" opacity="0.8" style={{ cursor: 'pointer' }} onMouseDown={() => onPadHit?.(lane)} data-testid={`soundpad-square-${lane}`} />
            <rect x={cx - 20} y={cy - 20} width="40" height="40" fill="none" stroke={color} strokeWidth="1" opacity="0.3" style={{ pointerEvents: 'none' }} />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="12" fontWeight="bold" fontFamily="Rajdhani, monospace" opacity="1" style={{ pointerEvents: 'none' }}>
              {key}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
