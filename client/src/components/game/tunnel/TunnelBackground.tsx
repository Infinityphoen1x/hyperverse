// src/components/TunnelBackground.tsx
import React, { memo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { getHealthBasedRayColor } from '@/lib/utils/tunnelUtils';
import { HexagonLayers } from './HexagonLayers';
import { ParallaxHexagonLayers } from './ParallaxHexagonLayers';
import { RadialSpokes } from './RadialSpokes';
import { SyncLineHexagons } from './SyncLineHexagons';
import { useTunnelRotation } from '@/hooks/effects/tunnel/useTunnelRotation';
import { useZoomEffect } from '@/hooks/effects/screen/useZoomEffect';
import { VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT } from '@/lib/config';

interface TunnelBackgroundProps {
  vpX?: number;
  vpY?: number;
  hexCenterX?: number;
  hexCenterY?: number;
  health?: number;
}

const TunnelBackgroundComponent = ({ 
  vpX = VANISHING_POINT_X, 
  vpY = VANISHING_POINT_Y, 
  hexCenterX = VANISHING_POINT_X,
  hexCenterY = VANISHING_POINT_Y,
  health: propHealth 
}: TunnelBackgroundProps) => {
  const storeHealth = useGameStore(state => state.health);
  const health = propHealth ?? storeHealth;

  const rayColor = getHealthBasedRayColor(health);
  const baseTunnelRotation = useTunnelRotation(1.0); // Get base rotation with full idle speed
  
  // ZOOM effect: compression + rotation + scale
  const { zoomIntensity, zoomRotation, zoomScale } = useZoomEffect();
  const tunnelRotation = baseTunnelRotation + zoomRotation;

  return (
    <div 
      className="relative" 
      data-testid="tunnel-background"
      style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, margin: '0 auto' }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1 }} data-testid="tunnel-background-svg">
        <circle cx={vpX} cy={vpY} r="6" fill="rgba(0,255,255,0.05)" data-testid="vanishing-point-circle" />
        {/* Parallax background layer - per-layer depth scaling with delays */}
        <ParallaxHexagonLayers rayColor={rayColor} vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} rotationOffset={tunnelRotation} zoomIntensity={zoomIntensity} zoomScale={zoomScale} />
        {/* Main foreground tunnel - full speed */}
        <HexagonLayers rayColor={rayColor} vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} rotationOffset={tunnelRotation} zoomIntensity={zoomIntensity} zoomScale={zoomScale} />
        <RadialSpokes rayColor={rayColor} vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} rotationOffset={tunnelRotation} zoomIntensity={zoomIntensity} zoomScale={zoomScale} />
        <SyncLineHexagons vpX={vpX} vpY={vpY} rotationOffset={tunnelRotation} zoomScale={zoomScale} />
      </svg>
    </div>
  );
};

export const TunnelBackground = memo(TunnelBackgroundComponent, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these props actually change
  return (
    prevProps.vpX === nextProps.vpX &&
    prevProps.vpY === nextProps.vpY &&
    prevProps.hexCenterX === nextProps.hexCenterX &&
    prevProps.hexCenterY === nextProps.hexCenterY &&
    prevProps.health === nextProps.health
  );
});