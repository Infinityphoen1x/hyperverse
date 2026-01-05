// src/components/SoundpadButtons.tsx
import React, { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with vpX, vpY (e.g., viewport state)
import { SoundpadButton } from './SoundpadButton';
import { calculateButtonPosition } from '@/lib/utils/soundpadUtils';
import { useTunnelRotation } from '@/hooks/useTunnelRotation';
import { BUTTON_CONFIG, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';

interface SoundpadButtonsProps {
  // Optional overrides; defaults to fixed VP for outer hexagon alignment
  vpX?: number;
  vpY?: number;
  onPadHit?: (lane: number) => void;
  zoomScale?: number;
}

export function SoundpadButtons(props: SoundpadButtonsProps = {}) {
  const { vpX = VANISHING_POINT_X, vpY = VANISHING_POINT_Y, onPadHit = () => {}, zoomScale = 1.0 } = props;
  const tunnelRotation = useTunnelRotation();
  
  // Use fixed vanishing point for soundpad buttons (same as outer hexagon)
  const fixedVpX = VANISHING_POINT_X;
  const fixedVpY = VANISHING_POINT_Y;
  
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
        const position = calculateButtonPosition(angle, fixedVpX, fixedVpY, tunnelRotation, zoomScale);
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
