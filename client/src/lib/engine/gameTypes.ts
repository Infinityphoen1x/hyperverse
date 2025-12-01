/**
 * Re-export hub for game types
 * Maintains backward compatibility - all existing imports continue to work
 * Core types are now defined in @/types/game.ts
 */

export type {
  Difficulty,
  GameState,
  NoteType,
  Note,
  GameConfig,
  ScoreState,
  TimingResult,
  FailureType,
  InputHandler,
  Processor,
  PostProcessor,
  GameStoreState,
} from '@/types/game';
