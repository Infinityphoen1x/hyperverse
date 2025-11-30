// ============================================================================
// TIMING MANAGER - Handles all time-related calculations
// ============================================================================

export class TimingManager {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private isPaused: boolean = false;

  start(): void {
    this.startTime = performance.now();
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.isPaused = false;
  }

  pause(): void {
    if (!this.isPaused) {
      this.pausedTime = performance.now();
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isPaused) {
      this.totalPausedDuration += performance.now() - this.pausedTime;
      this.isPaused = false;
      this.pausedTime = 0;
    }
  }

  getCurrentTime(videoTime?: number | null): number {
    // Prefer authoritative video time if available
    if (videoTime !== undefined && videoTime !== null && videoTime >= 0) {
      return Math.round(videoTime);
    }
    
    // Fallback to performance-based timing
    const now = performance.now();
    const elapsed = now - this.startTime - this.totalPausedDuration;
    return Math.round(Math.max(0, elapsed));
  }

  reset(): void {
    this.startTime = 0;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.isPaused = false;
  }
}
