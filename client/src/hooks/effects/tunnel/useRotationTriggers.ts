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
  // Find upcoming HOLD notes that require rotation (diamond positions 0-3: W/O/I/E)
  const upcomingHolds = notes.filter(n =>
    n.type === 'HOLD' &&
    requiresRotation(n.lane) && // DEPRECATED: note.lane field, treat as position
    !n.hit &&
    !n.holdMissFailure &&
    n.time > currentTime
  );
  
  // If no diamond position holds upcoming, check if we should rotate back to neutral for horizontal position (Q/P) holds
  if (upcomingHolds.length === 0) {
    // Find upcoming Q or P (horizontal position) holds
    const upcomingDeckHolds = notes.filter(n =>
      n.type === 'HOLD' &&
      (n.lane === -1 || n.lane === -2) && // DEPRECATED: note.lane field, treat as horizontal positions
      !n.hit &&
      !n.holdMissFailure &&
      n.time > currentTime
    );
    
    // If deck holds are coming and we're not at neutral rotation, rotate back to 0°
    if (upcomingDeckHolds.length > 0) {
      const currentTunnelRotation = useGameStore.getState().tunnelRotation;
      const normalizedCurrent = ((currentTunnelRotation % 360) + 360) % 360;
      
      // Only rotate back if we're significantly off from neutral (more than 5°)
      if (Math.abs(normalizedCurrent) > 5 && Math.abs(normalizedCurrent - 360) > 5) {
        upcomingDeckHolds.sort((a, b) => a.time - b.time);
        const nextDeckHold = upcomingDeckHolds[0];
        
        const playerSpeed = useGameStore.getState().playerSpeed || 40;
        const effectiveLeadTime = MAGIC_MS / playerSpeed;
        const ROTATION_TRIGGER_ADVANCE = 1700;
        const rotationStartTime = nextDeckHold.time - effectiveLeadTime - ROTATION_TRIGGER_ADVANCE;
        
        if (currentTime >= rotationStartTime) {
          // Rotate back to 0° (neutral position)
          const setTunnelRotation = useGameStore.getState().setTunnelRotation;
          if (rotationManager.shouldOverride(0)) {
            setTunnelRotation(0);
            rotationManager.triggerRotation(nextDeckHold.id, 0, currentTime);
          }
        }
      }
    }
    return;
  }
  
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
    const rotationDelta = getTargetRotation(nextHold.lane, currentTunnelRotation); // DEPRECATED: note.lane field, treat as position
    const targetAngle = currentTunnelRotation + rotationDelta;
    
    // Only trigger if we need a new rotation
    if (rotationManager.shouldOverride(targetAngle)) {
      const setTunnelRotation = useGameStore.getState().setTunnelRotation;
      setTunnelRotation(targetAngle);
      rotationManager.triggerRotation(nextHold.id, targetAngle, currentTime);
    }
  }
}
