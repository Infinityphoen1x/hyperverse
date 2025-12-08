// src/utils/judgementLineUtils.ts
import { JUDGEMENT_RADIUS, COLOR_DECK_LEFT, COLOR_DECK_RIGHT } from '@/lib/config';

interface LineConfig {
  angle: number;
  color: string;
  key?: string;
}

export const calculateLinePoints = (config: LineConfig, vpX: number, vpY: number, lineWidth: number, rotationOffset: number = 0): { x1: number; y1: number; x2: number; y2: number } => {
  const rad = ((config.angle + rotationOffset) * Math.PI) / 180;
  const cx = vpX + Math.cos(rad) * JUDGEMENT_RADIUS;
  const cy = vpY + Math.sin(rad) * JUDGEMENT_RADIUS;
  const perpRad = rad + Math.PI / 2;
  const x1 = cx + Math.cos(perpRad) * (lineWidth / 2);
  const y1 = cy + Math.sin(perpRad) * (lineWidth / 2);
  const x2 = cx - Math.cos(perpRad) * (lineWidth / 2);
  const y2 = cy - Math.sin(perpRad) * (lineWidth / 2);
  return { x1, y1, x2, y2 };
};

export const TAP_LINE_CONFIGS: LineConfig[] = [
  { angle: 120, color: '#FF007F', key: 'W' },
  { angle: 60, color: '#0096FF', key: 'O' },
  { angle: 300, color: '#BE00FF', key: 'I' },
  { angle: 240, color: '#00FFFF', key: 'E' },
];

export const HOLD_LINE_CONFIGS: LineConfig[] = [
  { angle: 180, color: COLOR_DECK_LEFT },
  { angle: 0, color: COLOR_DECK_RIGHT },
];