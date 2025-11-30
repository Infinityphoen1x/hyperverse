import { Note, NoteType } from './game_engine_core';

// ============================================================================
// DEBUG & ERROR TRACKING (Optional, completely decoupled)
// ============================================================================

export type FailureType = 
  | 'tapTooEarlyFailure'
  | 'tapMissFailure'
  | 'tooEarlyFailure'
  | 'holdMissFailure'
  | 'holdReleaseFailure'
  | 'successful';

export interface AnimationTrackingEntry {
  noteId: string;
  type: FailureType;
  failureTime?: number;
  renderStart?: number;
  renderEnd?: number;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  errorMsg?: string;
}

export interface NoteStatistics {
  total: number;
  tap: number;
  hold: number;
  hit: number;
  missed: number;
  failed: number;
  byLane: Record<number, number>;
}

export interface HitStatistics {
  successfulHits: number;
  tapTooEarlyFailures: number;
  tapMissFailures: number;
  tooEarlyFailures: number;
  holdMissFailures: number;
  holdReleaseFailures: number;
}

export interface RenderStatistics {
  rendered: number;
  preMissed: number;
}

export interface AnimationStatistics {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  rendering: number;
}

/**
 * GameDebugger - Optional debugging utility
 * Can be attached to game engine for development/debugging
 */
export class GameDebugger {
  private errorLog: string[] = [];
  private animationTracking: AnimationTrackingEntry[] = [];
  private noteStats: NoteStatistics = this.createEmptyNoteStats();
  private hitStats: HitStatistics = this.createEmptyHitStats();
  private renderStats: RenderStatistics = { rendered: 0, preMissed: 0 };
  
  private readonly MAX_LOG_SIZE = 100;
  private readonly MAX_ANIMATION_TRACKING = 200;

  constructor(private enableConsole: boolean = true) {}

  log(message: string): void {
    const timestamp = Date.now();
    const logEntry = `[${timestamp}] ${message}`;
    
    this.errorLog.push(logEntry);
    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog.shift();
    }

    if (this.enableConsole) {
      console.warn(`[GAME DEBUG] ${logEntry}`);
    }
  }

  trackAnimation(noteId: string, type: FailureType, failureTime?: number): void {
    this.animationTracking.push({
      noteId,
      type,
      failureTime,
      status: 'pending',
    });

    if (this.animationTracking.length > this.MAX_ANIMATION_TRACKING) {
      this.animationTracking.shift();
    }
  }

  updateAnimation(noteId: string, updates: Partial<AnimationTrackingEntry>): void {
    const entry = this.animationTracking.find(a => a.noteId === noteId);
    if (entry) {
      Object.assign(entry, updates);
    }
  }

  updateRenderStats(rendered: number, preMissed: number): void {
    this.renderStats = { rendered, preMissed };
  }

  updateNoteStats(notes: Note[]): void {
    const noteStats = this.createEmptyNoteStats();
    const hitStats = this.createEmptyHitStats();

    for (const note of notes) {
      noteStats.total++;
      noteStats.byLane[note.lane] = (noteStats.byLane[note.lane] || 0) + 1;

      if (note.type === 'TAP') {
        noteStats.tap++;
      } else {
        noteStats.hold++;
      }

      if (note.hit) {
        noteStats.hit++;
        hitStats.successfulHits++;
      }

      if (note.missed) {
        noteStats.missed++;
      }

      const failures = this.getFailures(note);
      if (failures.length > 0) {
        noteStats.failed++;
        failures.forEach(failure => {
          hitStats[`${failure}s` as keyof HitStatistics]++;
        });
      }
    }

    this.noteStats = noteStats;
    this.hitStats = hitStats;
  }

  getAnimationStats(): AnimationStatistics {
    return {
      total: this.animationTracking.length,
      completed: this.animationTracking.filter(a => a.status === 'completed').length,
      failed: this.animationTracking.filter(a => a.status === 'failed').length,
      pending: this.animationTracking.filter(a => a.status === 'pending').length,
      rendering: this.animationTracking.filter(a => a.status === 'rendering').length,
    };
  }

  getErrorLog(): string[] {
    return [...this.errorLog];
  }

  getAnimationTracking(): AnimationTrackingEntry[] {
    return [...this.animationTracking];
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
    this.animationTracking = [];
    this.noteStats = this.createEmptyNoteStats();
    this.hitStats = this.createEmptyHitStats();
    this.renderStats = { rendered: 0, preMissed: 0 };
  }

  private createEmptyNoteStats(): NoteStatistics {
    return {
      total: 0,
      tap: 0,
      hold: 0,
      hit: 0,
      missed: 0,
      failed: 0,
      byLane: {},
    };
  }

  private createEmptyHitStats(): HitStatistics {
    return {
      successfulHits: 0,
      tapTooEarlyFailures: 0,
      tapMissFailures: 0,
      tooEarlyFailures: 0,
      holdMissFailures: 0,
      holdReleaseFailures: 0,
    };
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

/**
 * Hook for using debugger in React components
 */
import { useRef, useEffect } from 'react';

export function useGameDebugger(enabled: boolean = true): GameDebugger {
  const debuggerRef = useRef<GameDebugger>();
  
  if (!debuggerRef.current) {
    debuggerRef.current = new GameDebugger(enabled);
  }

  useEffect(() => {
    return () => {
      debuggerRef.current?.clear();
    };
  }, []);

  return debuggerRef.current;
}

/**
 * React DevTools helper - displays debug info in component tree
 */
import { useDebugValue as useReactDebugValue } from 'react';

export function useDebugValue(debugValue: GameDebugger): void {
  const stats = {
    animations: debugValue.getAnimationStats(),
    notes: debugValue.getNoteStats(),
    hits: debugValue.getHitStats(),
    render: debugValue.getRenderStats(),
  };

  useReactDebugValue(stats);
}
