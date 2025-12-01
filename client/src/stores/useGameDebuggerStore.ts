import { create } from 'zustand';
import { FailureType } from '@/types/gameDebugTypes';

export interface AnimationTrackingEntry {
  noteId: string;
  type: FailureType;
  failureTime?: number;
  completed: boolean;
}

export interface NoteStatsType {
  total: number;
  tap: number;
  hold: number;
  hit: number;
  missed: number;
  failed: number;
  byLane: Record<number, number>;
}

export interface HitStatsType {
  successfulHits: number;
  tapTooEarlyFailures: number;
  tapMissFailures: number;
  tooEarlyFailures: number;
  holdMissFailures: number;
  holdReleaseFailures: number;
}

export interface RenderStatsType {
  rendered: number;
  preMissed: number;
}

export interface GameDebuggerStoreState {
  notes: string[];
  animations: AnimationTrackingEntry[];
  noteStats: NoteStatsType;
  renderStats: RenderStatsType;
  hitStats: HitStatsType;

  log: (msg: string) => void;
  trackAnimation: (noteId: string, type: FailureType, failureTime?: number) => void;
  updateAnimation: (noteId: string, updates: Partial<AnimationTrackingEntry>) => void;
  updateNoteStats: (notes: any[]) => void;
  updateRenderStats: (rendered: number, preMissed: number) => void;
}

export const useGameDebuggerStore = create<GameDebuggerStoreState>((set, get) => ({
  notes: [],
  animations: [],
  noteStats: { total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} },
  renderStats: { rendered: 0, preMissed: 0 },
  hitStats: { successfulHits: 0, tapTooEarlyFailures: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 },

  log: (msg) => {
    set((state) => ({ notes: [...state.notes, msg] }));
  },

  trackAnimation: (noteId, type, failureTime) => {
    set((state) => ({
      animations: [...state.animations, { noteId, type, failureTime, completed: false }],
    }));
  },

  updateAnimation: (noteId, updates) => {
    set((state) => ({
      animations: state.animations.map((a) =>
        a.noteId === noteId ? { ...a, ...updates } : a
      ),
    }));
  },

  updateNoteStats: (notes) => {
    const stats: NoteStatsType = { total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} };
    notes.forEach((note) => {
      stats.total++;
      if (note.type === 'TAP') stats.tap++;
      else stats.hold++;
      if (note.hit) stats.hit++;
      if (note.missed) stats.missed++;
      if (note.failed) stats.failed++;
      stats.byLane[note.lane] = (stats.byLane[note.lane] || 0) + 1;
    });
    set({ noteStats: stats });
  },

  updateRenderStats: (rendered, preMissed) => {
    set({ renderStats: { rendered, preMissed } });
  },
}));
