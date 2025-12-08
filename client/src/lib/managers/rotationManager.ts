// Rotation state manager - tracks and coordinates tunnel rotations
import { Note } from '@/lib/engine/gameTypes';

export interface RotationState {
  status: 'idle' | 'rotating' | 'settled';
  currentTargetNote: string | null; // ID of HOLD note that triggered current rotation
  targetAngle: number;
  rotationStartTime: number;
  nextQueuedRotation: { noteId: string; targetAngle: number } | null;
}

export class RotationManager {
  private state: RotationState = {
    status: 'idle',
    currentTargetNote: null,
    targetAngle: 0,
    rotationStartTime: 0,
    nextQueuedRotation: null,
  };

  getState(): RotationState {
    return { ...this.state };
  }

  /**
   * Trigger a new rotation
   * Cancels any previous rotation and starts fresh
   */
  triggerRotation(noteId: string, targetAngle: number, currentTime: number): void {
    // Cancel any queued rotation
    this.state.nextQueuedRotation = null;
    
    // Start new rotation
    this.state = {
      status: 'rotating',
      currentTargetNote: noteId,
      targetAngle,
      rotationStartTime: currentTime,
      nextQueuedRotation: null,
    };
  }

  /**
   * Mark rotation as settled (animation complete)
   */
  markSettled(): void {
    if (this.state.status === 'rotating') {
      this.state.status = 'settled';
    }
  }

  /**
   * Queue next rotation (for back-to-back HOLD notes)
   */
  queueRotation(noteId: string, targetAngle: number): void {
    this.state.nextQueuedRotation = { noteId, targetAngle };
  }

  /**
   * Handle HOLD note release - decide if we should rotate back to neutral
   */
  onHoldRelease(noteId: string, currentTime: number): boolean {
    // Only reset if this was the note that triggered rotation
    if (this.state.currentTargetNote !== noteId) return false;
    
    // If another rotation is queued, don't reset
    if (this.state.nextQueuedRotation !== null) {
      // Trigger the queued rotation instead
      const { noteId: queuedNoteId, targetAngle } = this.state.nextQueuedRotation;
      this.triggerRotation(queuedNoteId, targetAngle, currentTime);
      return true;
    }
    
    // Reset to neutral (0°)
    this.state = {
      status: 'rotating',
      currentTargetNote: null,
      targetAngle: 0,
      rotationStartTime: currentTime,
      nextQueuedRotation: null,
    };
    
    return true;
  }

  /**
   * Check if a rotation override is needed
   * Returns true if new rotation conflicts with current one
   */
  shouldOverride(newTargetAngle: number): boolean {
    // If idle, always trigger
    if (this.state.status === 'idle') return true;
    
    // If rotating to same angle, no override needed
    if (this.state.targetAngle === newTargetAngle) return false;
    
    // Different angle - override needed
    return true;
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.state = {
      status: 'idle',
      currentTargetNote: null,
      targetAngle: 0,
      rotationStartTime: 0,
      nextQueuedRotation: null,
    };
  }
}
