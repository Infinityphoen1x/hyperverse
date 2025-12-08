// src/utils/judgementLineUtils.ts
import { JUDGEMENT_RADIUS, COLOR_DECK_LEFT, COLOR_DECK_RIGHT, VANISHING_POINT_X, VANISHING_POINT_Y, TUNNEL_MAX_DISTANCE } from '@/lib/config';

interface LineConfig {
  angle: number;
  color: string;
  key?: string;
}

export const calculateLinePoints = (
  config: LineConfig, 
  vpX: number, 
  vpY: number, 
  lineWidth: number, 
  rotationOffset: number = 0,
  hexCenterX: number = VANISHING_POINT_X,
  hexCenterY: number = VANISHING_POINT_Y
): { x1: number; y1: number; x2: number; y2: number } => {
  // Calculate fixed outer corner position (with rotation)
  const angle = config.angle + rotationOffset;
  const rad = (angle * Math.PI) / 180;
  const outerCornerX = hexCenterX + TUNNEL_MAX_DISTANCE * Math.cos(rad);
  const outerCornerY = hexCenterY + TUNNEL_MAX_DISTANCE * Math.sin(rad);
  
  // Position judgment line along ray from VP to outer corner at JUDGEMENT_RADIUS distance
  const progress = JUDGEMENT_RADIUS / TUNNEL_MAX_DISTANCE;
  const cx = vpX + (outerCornerX - vpX) * progress;
  const cy = vpY + (outerCornerY - vpY) * progress;
  
  // Calculate perpendicular direction for line width
  const rayAngle = Math.atan2(outerCornerY - vpY, outerCornerX - vpX);
  const perpRad = rayAngle + Math.PI / 2;
  const x1 = cx + Math.cos(perpRad) * (lineWidth / 2);
  const y1 = cy + Math.sin(perpRad) * (lineWidth / 2);
  const x2 = cx - Math.cos(perpRad) * (lineWidth / 2);
  const y2 = cy - Math.sin(perpRad) * (lineWidth / 2);
  return { x1, y1, x2, y2 };
};

export const TAP_LINE_CONFIGS: LineConfig[] = [
  { angle: 120, color: '#FF6600', key: 'W' }, // Neon orange (was pink #FF007F)
  { angle: 60, color: '#0096FF', key: 'O' },
  { angle: 300, color: '#BE00FF', key: 'I' },
  { angle: 240, color: '#00FFFF', key: 'E' },
];

export const HOLD_LINE_CONFIGS: LineConfig[] = [
  { angle: 180, color: COLOR_DECK_LEFT },
  { angle: 0, color: COLOR_DECK_RIGHT },
];