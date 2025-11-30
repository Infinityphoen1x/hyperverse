import { AnimationTrackingEntry, FailureType, AnimationStatistics } from './gameDebugTypes';

export class AnimationTracker {
  private tracking: AnimationTrackingEntry[] = [];
  private readonly MAX_ENTRIES = 200;

  track(noteId: string, type: FailureType, failureTime?: number): void {
    this.tracking.push({ noteId, type, failureTime, status: 'pending' });
    if (this.tracking.length > this.MAX_ENTRIES) {
      this.tracking.shift();
    }
  }

  update(noteId: string, updates: Partial<AnimationTrackingEntry>): void {
    const entry = this.tracking.find(a => a.noteId === noteId);
    if (entry) {
      Object.assign(entry, updates);
    }
  }

  getStats(): AnimationStatistics {
    return {
      total: this.tracking.length,
      completed: this.tracking.filter(a => a.status === 'completed').length,
      failed: this.tracking.filter(a => a.status === 'failed').length,
      pending: this.tracking.filter(a => a.status === 'pending').length,
      rendering: this.tracking.filter(a => a.status === 'rendering').length,
    };
  }

  getEntries(): AnimationTrackingEntry[] {
    return [...this.tracking];
  }

  clear(): void {
    this.tracking = [];
  }
}
