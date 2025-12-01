// src/components/TunnelBackground.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with viewport/health state
import { getHealthBasedRayColor } from '@/utils/tunnelUtils';
import { HexagonLayers } from './HexagonLayers';
import { RadialSpokes } from './RadialSpokes';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config/gameConstants';

interface TunnelBackgroundProps {
  // Optional overrides; defaults to store for global sync
  vpX?: number;
  vpY?: number;
  hexCenterX?: number;
  hexCenterY?: number;
  health?: number;
}

export function TunnelBackground({ 
  vpX: propVpX = VANISHING_POINT_X, 
  vpY: propVpY = VANISHING_POINT_Y, 
  hexCenterX: propHexCenterX, 
  hexCenterY: propHexCenterY, 
  health: propHealth 
}: TunnelBackgroundProps) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { vpX, vpY, hexCenterX, hexCenterY, health } = useGameStore(state => ({
    vpX: propVpX ?? state.vpX ?? VANISHING_POINT_X,
    vpY: propVpY ?? state.vpY ?? VANISHING_POINT_Y,
    hexCenterX: propHexCenterX ?? state.hexCenterX,
    hexCenterY: propHexCenterY ?? state.hexCenterY,
    health: propHealth ?? state.health,
  }));

  const rayColor = getHealthBasedRayColor(health);

  return (
    <div 
      className="relative" 
      style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, margin: '0 auto' }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1 }}>
        <circle cx={vpX} cy={vpY} r="6" fill="rgba(0,255,255,0.05)" />
        <HexagonLayers rayColor={rayColor} vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} />
        <RadialSpokes rayColor={rayColor} vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} />
      </svg>
    </div>
  );
}