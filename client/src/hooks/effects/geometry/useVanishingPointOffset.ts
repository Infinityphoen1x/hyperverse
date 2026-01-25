// src/hooks/useVanishingPointOffset.ts
import { useVanishingPointStore } from '@/stores/useVanishingPointStore';

interface Offset {
  x: number;
  y: number;
}

export function useVanishingPointOffset(): Offset {
  return useVanishingPointStore((state) => state.vpOffset);
}