// src/hooks/useGameConfig.ts
import { Difficulty, GameConfig } from '@/lib/engine/gameTypes';
import { MAX_HEALTH } from '@/lib/config/gameConstants';

export function useGameConfig(_difficulty: Difficulty): GameConfig {
  // In real implementation, load these from constants file
  return {
    TAP_HIT_WINDOW: 150,
    TAP_FAILURE_BUFFER: 100,
    HOLD_HIT_WINDOW: 150,
    HOLD_MISS_TIMEOUT: 500,
    HOLD_RELEASE_OFFSET: 200,
    HOLD_RELEASE_WINDOW: 150,
    HOLD_ACTIVATION_WINDOW: 300,
    LEAD_TIME: 4000,
    ACCURACY_PERFECT_MS: 50,
    ACCURACY_GREAT_MS: 100,
    ACCURACY_PERFECT_POINTS: 100,
    ACCURACY_GREAT_POINTS: 75,
    ACCURACY_NORMAL_POINTS: 50,
    MAX_HEALTH: MAX_HEALTH,
  };
}