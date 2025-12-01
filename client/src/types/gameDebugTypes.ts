export type FailureType = 
  | 'tapTooEarlyFailure'
  | 'tapMissFailure'
  | 'tooEarlyFailure'
  | 'holdMissFailure'
  | 'holdReleaseFailure';

export interface AnimationTrackingEntry {
  noteId: string;
  type: FailureType;
  failureTime?: number;
  completed: boolean;
}
