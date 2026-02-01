// src/components/TunnelBackground.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { getHealthBasedRayColor } from '@/lib/utils/tunnelUtils';
import { sanitizeCoordinate } from '@/hooks/utils/useSafeVanishingPoint';
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
  vpX, 
  vpY, 
  hexCenterX,
  hexCenterY,
  health: propHealth 
}: TunnelBackgroundProps) => {
  const storeHealth = useGameStore(state => state.health);
  const health = propHealth ?? storeHealth;

  // DEBUG: Log input props
  if (!isFinite(vpX) || !isFinite(vpY) || !isFinite(hexCenterX) || !isFinite(hexCenterY)) {
    console.error('[TunnelBackground] NaN in props:', { vpX, vpY, hexCenterX, hexCenterY, health });
  }

  // Sanitize coordinates to prevent NaN rendering issues
  const safeVpX = sanitizeCoordinate(vpX, VANISHING_POINT_X);
  const safeVpY = sanitizeCoordinate(vpY, VANISHING_POINT_Y);
  const safeHexCenterX = sanitizeCoordinate(hexCenterX, VANISHING_POINT_X);
  const safeHexCenterY = sanitizeCoordinate(hexCenterY, VANISHING_POINT_Y);
  
  // DEBUG: Log sanitized values
  if (!isFinite(safeVpX) || !isFinite(safeVpY)) {
    console.error('[TunnelBackground] NaN after sanitization:', { safeVpX, safeVpY, safeHexCenterX, safeHexCenterY });
  }

  const rayColor = getHealthBasedRayColor(health);
  const baseTunnelRotation = useTunnelRotation(1.0); // Get base rotation with full idle speed
  
  // ZOOM effect: compression + rotation + scale
  const { zoomIntensity, zoomRotation, zoomScale } = useZoomEffect();
  
  // Sanitize rotation values and calculate final rotation
  const safeBaseRotation = isFinite(baseTunnelRotation) ? baseTunnelRotation : 0;
  const safeZoomRotation = isFinite(zoomRotation) ? zoomRotation : 0;
  const tunnelRotation = safeBaseRotation + safeZoomRotation;
  
  // DEBUG: Log rotation values
  if (!isFinite(tunnelRotation)) {
    console.error('[TunnelBackground] NaN in rotation:', {
      baseTunnelRotation,
      safeBaseRotation,
      zoomRotation,
      safeZoomRotation,
      zoomIntensity,
      zoomScale,
      tunnelRotation
    });
  }

  return (
    <div 
      className="relative" 
      data-testid="tunnel-background"
      style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, margin: '0 auto' }}
    >
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1 }} data-testid="tunnel-background-svg">
        <circle cx={safeVpX} cy={safeVpY} r="6" fill="rgba(0,255,255,0.05)" data-testid="vanishing-point-circle" />
        {/* Parallax background layer - per-layer depth scaling with delays */}
        <ParallaxHexagonLayers rayColor={rayColor} vpX={safeVpX} vpY={safeVpY} hexCenterX={safeHexCenterX} hexCenterY={safeHexCenterY} rotationOffset={tunnelRotation} zoomIntensity={zoomIntensity} zoomScale={zoomScale} />
        {/* Main foreground tunnel - full speed */}
        <HexagonLayers rayColor={rayColor} vpX={safeVpX} vpY={safeVpY} hexCenterX={safeHexCenterX} hexCenterY={safeHexCenterY} rotationOffset={tunnelRotation} zoomIntensity={zoomIntensity} zoomScale={zoomScale} />
        <RadialSpokes rayColor={rayColor} vpX={safeVpX} vpY={safeVpY} hexCenterX={safeHexCenterX} hexCenterY={safeHexCenterY} rotationOffset={tunnelRotation} zoomIntensity={zoomIntensity} zoomScale={zoomScale} />
        <SyncLineHexagons vpX={safeVpX} vpY={safeVpY} rotationOffset={tunnelRotation} zoomScale={zoomScale} />
      </svg>
    </div>
  );
};

// Export without memo - tunnel contains dynamic hooks (rotation, zoom) that need to update every frame
// Custom memo comparison was blocking re-renders and causing tunnel to disappear
export const TunnelBackground = TunnelBackgroundComponent;