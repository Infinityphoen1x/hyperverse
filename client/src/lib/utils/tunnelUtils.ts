// src/utils/tunnelUtils.ts
import { MAX_HEALTH } from '@/lib/config/gameConstants';

export const getHealthBasedRayColor = (health: number): string => {
  const healthFactor = Math.max(0, MAX_HEALTH - health) / MAX_HEALTH;
  const r = Math.round(0 + (255 - 0) * healthFactor);
  const g = Math.round(255 * (1 - healthFactor));
  const b = Math.round(255 * (1 - healthFactor));
  return `rgba(${r},${g},${b},1)`;
};