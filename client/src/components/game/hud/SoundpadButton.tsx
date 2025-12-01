// src/components/SoundpadButton.tsx
import React from 'react';
import { BUTTON_CONFIG } from '@/lib/config/gameConstants';

interface SoundpadButtonProps {
  lane: number;
  position: { cx: number; cy: number };
  onPadHit: (lane: number) => void;
}

export const SoundpadButton: React.FC<SoundpadButtonProps> = ({ lane, position, onPadHit }) => {
  const { key, color } = BUTTON_CONFIG.find(config => config.lane === lane)!; // Assumes config has unique lanes
  const { cx, cy } = position;

  return (
    <g data-testid={`soundpad-button-${lane}`}>
      <rect
        x={cx - 20}
        y={cy - 20}
        width="40"
        height="40"
        fill={color}
        stroke={color}
        strokeWidth="2"
        opacity="0.8"
        style={{ cursor: 'pointer' }}
        onMouseDown={() => onPadHit(lane)}
      />
      <rect
        x={cx - 20}
        y={cy - 20}
        width="40"
        height="40"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.3"
        style={{ pointerEvents: 'none' }}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize="12"
        fontWeight="bold"
        fontFamily="Rajdhani, monospace"
        opacity="1"
        style={{ pointerEvents: 'none' }}
      >
        {key}
      </text>
    </g>
  );
};