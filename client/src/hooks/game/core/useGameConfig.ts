// src/hooks/useGameConfig.ts
import { Difficulty, GameConfig } from '@/lib/engine/gameTypes';
import { GAME_CONFIG } from '@/lib/config';

export function useGameConfig(_difficulty: Difficulty): GameConfig {
  // Returns game config from single source of truth (gameConstants.ts)
  return GAME_CONFIG as GameConfig;
}