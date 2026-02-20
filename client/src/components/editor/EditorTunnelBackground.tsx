// Editor wrapper for TunnelBackground - matches gameplay structure exactly
import { useEffect, useRef } from 'react';
import { TunnelBackground } from '@/components/game/tunnel/TunnelBackground';

interface EditorTunnelBackgroundProps {
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  health: number;
}

export function EditorTunnelBackground({
  vpX,
  vpY,
  hexCenterX,
  hexCenterY,
  health,
}: EditorTunnelBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Safety check for NaN values
  const safeVpX = isNaN(vpX) ? 350 : vpX;
  const safeVpY = isNaN(vpY) ? 300 : vpY;
  const safeHexCenterX = isNaN(hexCenterX) ? 350 : hexCenterX;
  const safeHexCenterY = isNaN(hexCenterY) ? 300 : hexCenterY;

  // Use TunnelBackground exactly as in gameplay - no modifications
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <TunnelBackground
        vpX={safeVpX}
        vpY={safeVpY}
        hexCenterX={safeHexCenterX}
        hexCenterY={safeHexCenterY}
        health={health}
      />
    </div>
  );
}
