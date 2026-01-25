/**
 * Rotation trigger management
 * Handles automatic tunnel rotation for approaching HOLD notes
 */

import type { Note } from '@/types/game';
import { RotationManager } from '@/lib/managers/rotationManager';
import { useGameStore } from '@/stores/useGameStore';
import { MAGIC_MS } from '@/lib/config';
import { requiresRotation, getTargetRotation } from '@/lib/config/rotationConstants';

interface CheckRotationTriggersParams {
  notes: Note[];
  currentTime: number;
  rotationManager: RotationManager;
}

/**
 * Check and trigger automatic rotations for upcoming HOLD notes
 * Rotations trigger before notes spawn to allow time for animation and settle
 */
export function checkRotationTriggers({
  notes,
  currentTime,
  rotationManager,
}: CheckRotationTriggersParams): void {
  // Find upcoming HOLD notes that require rotation
  const upcomingHolds = notes.filter(n =>
    n.type === 'HOLD' &&
    requiresRotation(n.lane) &&
    !n.hit &&
    !n.holdMissFailure &&
    n.time > currentTime
  );
  
  if (upcomingHolds.length === 0) return;
  
  // Sort by time, get the closest one
  upcomingHolds.sort((a, b) => a.time - b.time);
  const nextHold = upcomingHolds[0];
  
  // Calculate when rotation should start, using effectiveLeadTime to match note velocity
  const playerSpeed = useGameStore.getState().playerSpeed || 20;
  const effectiveLeadTime = MAGIC_MS / playerSpeed;
  const ROTATION_TRIGGER_ADVANCE = 1700; // ROTATION_DURATION + SETTLE_TIME
  const rotationStartTime = nextHold.time - effectiveLeadTime - ROTATION_TRIGGER_ADVANCE;
  
  // Trigger rotation if we've reached start time
  if (currentTime >= rotationStartTime) {
    const currentTunnelRotation = useGameStore.getState().tunnelRotation;
    const rotationDelta = getTargetRotation(nextHold.lane, currentTunnelRotation);
    const targetAngle = currentTunnelRotation + rotationDelta;
    
    // Only trigger if we need a new rotation
    if (rotationManager.shouldOverride(targetAngle)) {
      const setTunnelRotation = useGameStore.getState().setTunnelRotation;
      setTunnelRotation(targetAngle);
      rotationManager.triggerRotation(nextHold.id, targetAngle, currentTime);
    }
  }
}
