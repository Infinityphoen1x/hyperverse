// src/hooks/useShake.ts
import { useShakeStore } from '@/stores/useShakeStore';
import type { ShakeOffset } from '@/types/visualEffects';

export const useShake = (): ShakeOffset => useShakeStore((state) => state.shakeOffset);