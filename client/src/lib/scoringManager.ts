import { GameConfig, ScoreState } from './game_types';

// ============================================================================
// SCORING MANAGER - Handles score, combo, health
// ============================================================================

export class ScoringManager {
  private state: ScoreState;
  
  constructor(private config: GameConfig) {
    this.state = {
      score: 0,
      combo: 0,
      health: config.MAX_HEALTH,
    };
  }

  getState(): ScoreState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      score: 0,
      combo: 0,
      health: this.config.MAX_HEALTH,
    };
  }

  calculateHitScore(timingError: number): number {
    const absError = Math.abs(timingError);
    if (absError < this.config.ACCURACY_PERFECT_MS) {
      return this.config.ACCURACY_PERFECT_POINTS;
    }
    if (absError < this.config.ACCURACY_GREAT_MS) {
      return this.config.ACCURACY_GREAT_POINTS;
    }
    return this.config.ACCURACY_NORMAL_POINTS;
  }

  recordHit(timingError: number): ScoreState {
    const points = this.calculateHitScore(timingError);
    this.state.score += points;
    this.state.combo += 1;
    this.state.health = Math.min(this.config.MAX_HEALTH, this.state.health + 1);
    return this.getState();
  }

  recordMiss(): ScoreState {
    this.state.combo = 0;
    this.state.health = Math.max(0, this.state.health - 2);
    return this.getState();
  }

  isDead(): boolean {
    return this.state.health <= 0;
  }
}
