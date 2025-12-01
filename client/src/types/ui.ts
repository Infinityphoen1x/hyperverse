/**
 * UI and component types
 * For use in Zustand store and UI-related components
 */

import type { Difficulty, GameState } from './game';

export interface UIState {
  isPauseMenuOpen: boolean;
  countdownSeconds: number;
  resumeFadeOpacity: number;
  showErrorLog: boolean;
}

export interface HomeUIState {
  selectedDifficulty: Difficulty;
  beatmapLoaded: boolean;
}

export interface ErrorDisplayState {
  errors: string[];
  errorCount: number;
  showViewer: boolean;
}

export interface HUDDisplayState {
  score: number;
  combo: number;
  health: number;
  healthPercentage: number;
  missCount: number;
  gameState: GameState;
}
