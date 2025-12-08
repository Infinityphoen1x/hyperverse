// Rotation trigger detection hook
import { useMemo } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Note } from '@/lib/engine/gameTypes';
import { ROTATION_CONFIG, requiresRotation, getTargetRotation } from '@/lib/config/rotationConstants';
import { LEAD_TIME } from '@/lib/config';

export interface RotationTrigger {
  shouldRotate: boolean;
  targetAngle: number;
  triggerTime: number;
  noteId: string;
  lane: number;
}

/**
 * Scans upcoming notes and determines if/when tunnel should rotate
 * Returns rotation trigger info for the next HOLD note requiring rotation
 */
export function useRotationTrigger(): RotationTrigger | null {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  const tunnelRotation = useGameStore(state => state.tunnelRotation);
  
  return useMemo(() => {
    if (!notes || notes.length === 0) return null;
    
    // Find upcoming HOLD notes that require rotation (lanes 0, 1, 2, 3)
    const upcomingHolds = notes.filter(n =>
      n.type === 'HOLD' &&
      requiresRotation(n.lane) &&
      !n.hit &&
      !n.holdMissFailure &&
      n.time > currentTime
    );
    
    if (upcomingHolds.length === 0) return null;
    
    // Sort by time, get the closest one
    upcomingHolds.sort((a, b) => a.time - b.time);
    const nextHold = upcomingHolds[0];
    
    // Calculate when rotation should start
    // rotationStart = noteTime - LEAD_TIME - ROTATION_DURATION - SETTLE_TIME
    const rotationStartTime = nextHold.time - LEAD_TIME - ROTATION_CONFIG.ROTATION_TRIGGER_ADVANCE;
    
    // Only trigger if we're at or past the rotation start time
    if (currentTime < rotationStartTime) return null;
    
    return {
      shouldRotate: true,
      targetAngle: getTargetRotation(nextHold.lane, tunnelRotation),
      triggerTime: rotationStartTime,
      noteId: nextHold.id,
      lane: nextHold.lane,
    };
  }, [notes, currentTime, tunnelRotation]);
}
