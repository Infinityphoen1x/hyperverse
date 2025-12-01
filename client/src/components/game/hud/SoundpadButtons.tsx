// src/components/SoundpadButtons.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with vpX, vpY (e.g., viewport state)
import { SoundpadButton } from './SoundpadButton';
import { calculateButtonPosition } from '@/lib/utils/soundpadUtils';
import { BUTTON_CONFIG, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';

interface SoundpadButtonsProps {
  // Optional overrides; defaults to store for global sync
  vpX?: number;
  vpY?: number;
  onPadHit?: (lane: number) => void;
}

export function SoundpadButtons({ vpX: propVpX, vpY: propVpY, onPadHit = () => {} }: SoundpadButtonsProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { vpX, vpY } = useGameStore(state => ({
    vpX: propVpX ?? state.vpX,
    vpY: propVpY ?? state.vpY,
  }));

  return (
    <svg
      className="absolute inset-0"
      style={{
        width: `${TUNNEL_CONTAINER_WIDTH}px`,
        height: `${TUNNEL_CONTAINER_HEIGHT}px`,
        opacity: 1,
        margin: '0 auto',
      }}
    >
      {BUTTON_CONFIG.map(({ lane, angle }) => {
        const position = calculateButtonPosition(angle, vpX, vpY);
        return (
          <SoundpadButton
            key={`soundpad-button-${lane}`}
            lane={lane}
            position={position}
            onPadHit={onPadHit}
          />
        );
      })}
    </svg>
  );
}
