import { Note } from '@/lib/engine/gameTypes';
import { HitStatistics, NoteStatistics, RenderStatistics, AnimationStatistics, FailureType, AnimationTrackingEntry } from './gameDebugTypes';
import { AnimationTracker } from './animationTracker';

const EMPTY_NOTE_STATS: NoteStatistics = {
  total: 0,
  tap: 0,
  hold: 0,
  hit: 0,
  missed: 0,
  failed: 0,
  byLane: {},
};

const EMPTY_HIT_STATS: HitStatistics = {
  successfulHits: 0,
  tapTooEarlyFailures: 0,
  tapMissFailures: 0,
  tooEarlyFailures: 0,
  holdMissFailures: 0,
  holdReleaseFailures: 0,
};

export class GameDebugger {
  private errorLog: string[] = [];
  private animationTracker: AnimationTracker;
  private noteStats: NoteStatistics = { ...EMPTY_NOTE_STATS };
  private hitStats: HitStatistics = { ...EMPTY_HIT_STATS };
  private renderStats: RenderStatistics = { rendered: 0, preMissed: 0 };
  private readonly MAX_LOG_SIZE = 100;

  constructor(private enableConsole: boolean = true) {
    this.animationTracker = new AnimationTracker();
  }

  log(message: string): void {
    const logEntry = `[${Date.now()}] ${message}`;
    this.errorLog.push(logEntry);
    if (this.errorLog.length > this.MAX_LOG_SIZE) this.errorLog.shift();
    if (this.enableConsole) console.warn(`[GAME DEBUG] ${logEntry}`);
  }

  trackAnimation(noteId: string, type: FailureType, failureTime?: number): void {
    this.animationTracker.track(noteId, type, failureTime);
  }

  updateAnimation(noteId: string, updates: Record<string, unknown>): void {
    this.animationTracker.update(noteId, updates as Partial<Record<string, unknown>>);
  }

  updateRenderStats(rendered: number, preMissed: number): void {
    this.renderStats = { rendered, preMissed };
  }

  updateNoteStats(notes: Note[]): void {
    const noteStats = { ...EMPTY_NOTE_STATS };
    const hitStats = { ...EMPTY_HIT_STATS };

    for (const note of notes) {
      noteStats.total++;
      noteStats.byLane[note.lane] = (noteStats.byLane[note.lane] || 0) + 1;
      if (note.type === 'TAP') noteStats.tap++;
      else noteStats.hold++;
      if (note.hit) {
        noteStats.hit++;
        hitStats.successfulHits++;
      }
      if (note.missed) noteStats.missed++;
      
      const failures = this.getFailures(note);
      if (failures.length > 0) {
        noteStats.failed++;
        failures.forEach(f => {
          hitStats[`${f}s` as keyof HitStatistics]++;
        });
      }
    }

    this.noteStats = noteStats;
    this.hitStats = hitStats;
  }

  getAnimationStats(): AnimationStatistics {
    return this.animationTracker.getStats();
  }

  getAnimationTracking(): AnimationTrackingEntry[] {
    return this.animationTracker.getEntries();
  }

  getErrorLog(): string[] {
    return [...this.errorLog];
  }

  getNoteStats(): NoteStatistics {
    return { ...this.noteStats, byLane: { ...this.noteStats.byLane } };
  }

  getHitStats(): HitStatistics {
    return { ...this.hitStats };
  }

  getRenderStats(): RenderStatistics {
    return { ...this.renderStats };
  }

  clear(): void {
    this.errorLog = [];
    this.animationTracker.clear();
    this.noteStats = { ...EMPTY_NOTE_STATS };
    this.hitStats = { ...EMPTY_HIT_STATS };
    this.renderStats = { rendered: 0, preMissed: 0 };
  }

  private getFailures(note: Note): string[] {
    const failures: string[] = [];
    if (note.tapTooEarlyFailure) failures.push('tapTooEarlyFailure');
    if (note.tapMissFailure) failures.push('tapMissFailure');
    if (note.tooEarlyFailure) failures.push('tooEarlyFailure');
    if (note.holdMissFailure) failures.push('holdMissFailure');
    if (note.holdReleaseFailure) failures.push('holdReleaseFailure');
    return failures;
  }
}

export { useGameDebugger, useDebugValue } from './gameDebugHooks';
// src/lib/engine/gameDebugTools.ts
import { Note } from '@/lib/engine/gameTypes';
import { HitStatistics, NoteStatistics, RenderStatistics, AnimationStatistics, FailureType, AnimationTrackingEntry } from './gameDebugTypes';
import { useGameDebugger, useDebugValue } from './gameDebugHooks'; // Hooks unchanged

// Legacy constants (if needed)
const EMPTY_NOTE_STATS: NoteStatistics = {
  total: 0,
  tap: 0,
  hold: 0,
  hit: 0,
  missed: 0,
  failed: 0,
  byLane: {},
};
const EMPTY_HIT_STATS: HitStatistics = {
  successfulHits: 0,
  tapTooEarlyFailures: 0,
  tapMissFailures: 0,
  tooEarlyFailures: 0,
  holdMissFailures: 0,
  holdReleaseFailures: 0,
};

// No class export; use hooks/stores directly
export { EMPTY_NOTE_STATS, EMPTY_HIT_STATS };
export { useGameDebugger, useDebugValue };