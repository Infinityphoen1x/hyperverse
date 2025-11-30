import { Note } from '@/lib/engine/gameTypes';

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
