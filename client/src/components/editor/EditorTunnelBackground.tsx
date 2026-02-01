/**
 * Editor tunnel background component
 * Thin wrapper providing NaN safety for vanishing point coordinates
 * Maintains identical structure to gameplay - no additional containers
 */
import { TunnelBackground } from '@/components/game/tunnel/TunnelBackground';
import { useSafeVanishingPoint } from '@/hooks/utils/useSafeVanishingPoint';

interface EditorTunnelBackgroundProps {
  vpX: number;
  vpY: number;
  hexCenterX: number;
  hexCenterY: number;
  health: number;
}

/**
 * Editor-specific tunnel background with coordinate validation
 * Ensures safe rendering even with potentially invalid VP values
 */
export function EditorTunnelBackground({
  vpX,
  vpY,
  hexCenterX,
  hexCenterY,
  health,
}: EditorTunnelBackgroundProps) {
  // DEBUG: Log input props
  if (!isFinite(vpX) || !isFinite(vpY) || !isFinite(hexCenterX) || !isFinite(hexCenterY)) {
    console.error('[EditorTunnelBackground] NaN in props:', { vpX, vpY, hexCenterX, hexCenterY, health });
  }
  
  // Validate and sanitize vanishing point coordinates
  const safeCoords = useSafeVanishingPoint({ vpX, vpY, hexCenterX, hexCenterY });
  
  // DEBUG: Log sanitized values
  if (!isFinite(safeCoords.vpX) || !isFinite(safeCoords.vpY)) {
    console.error('[EditorTunnelBackground] NaN after sanitization:', safeCoords);
  }

  return (
    <TunnelBackground
      {...safeCoords}
      health={health}
    />
  );
}
