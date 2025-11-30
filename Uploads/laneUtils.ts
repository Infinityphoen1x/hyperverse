// src/lib/utils/laneUtils.ts
import { MAX_HEALTH } from '@/lib/utils/gameConstants';

export const getColorForLane = (lane: number, health: number = MAX_HEALTH): string => {
  const baseColor = (() => {
    switch (lane) {
      case -1: return '#00FF00'; // Q - green
      case -2: return '#FF0000'; // P - red
      case 0: return '#FF007F'; // W - pink
      case 1: return '#0096FF'; // O - blue
      case 2: return '#BE00FF'; // I - purple
      case 3: return '#00FFFF'; // E - cyan
      default: return '#FFFFFF';
    }
  })();

  const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH;
  if (healthFactor === 0) return baseColor;

  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  const newR = Math.round(r + (255 - r) * healthFactor);
  const newG = Math.round(g * (1 - healthFactor));
  const newB = Math.round(b * (1 - healthFactor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase();
};