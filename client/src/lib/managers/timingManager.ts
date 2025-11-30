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

  /**
   * Sync timing to a known video time (used after resume to align with YouTube)
   * @param videoTimeMs The current video time in milliseconds
   */
  syncToVideoTime(videoTimeMs: number): void {
    console.log(`[TIMING-SYNC] Syncing to video time: ${videoTimeMs.toFixed(0)}ms`);
    // Reset start time so that getCurrentTime returns the video time
    this.startTime = performance.now() - videoTimeMs;
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
