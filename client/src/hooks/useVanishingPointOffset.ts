// src/hooks/useVanishingPointOffset.ts
import { useVanishingPointStore } from '@/stores/useVanishingPointStore';
import type { Offset } from '@/lib/engine/gameTypes'; // If typed globally

export function useVanishingPointOffset(): Offset {
  return useVanishingPointStore((state) => state.vpOffset);
}