// src/components/SoundpadButtons.tsx
import React, { useCallback } from 'react';
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

export function SoundpadButtons(props: SoundpadButtonsProps = {}) {
  const { vpX: propVpX, vpY: propVpY, onPadHit = () => {} } = props;
  
  // Memoize selector to prevent unnecessary store subscriptions
  const selector = useCallback(
    (state: any) => ({
      vpX: propVpX ?? state.vpX,
      vpY: propVpY ?? state.vpY,
    }),
    [propVpX, propVpY]
  );
  
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { vpX, vpY } = useGameStore(selector);

  // Validate viewport values before rendering
  const isValid = typeof vpX === 'number' && typeof vpY === 'number' && vpX >= 0 && vpY >= 0;
  
  if (!isValid) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0"
      data-testid="soundpad-container"
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
            data-testid={`soundpad-button-${lane}`}
          />
        );
      })}
    </svg>
  );
}
