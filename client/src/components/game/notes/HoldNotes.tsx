import React, { memo, useCallback } from 'react';
import { HoldNote } from './HoldNote';
import { useHoldNotes } from '@/hooks/useHoldNotes';
import { useGameStore } from '@/stores/useGameStore';
import { TUNNEL_CONTAINER_WIDTH, TUNNEL_CONTAINER_HEIGHT, LEAD_TIME } from '@/lib/config/gameConstants';

interface HoldNotesProps {
  vpX?: number;
  vpY?: number;
}

const HoldNotesComponent = ({ vpX: propVpX = 350, vpY: propVpY = 300 }: HoldNotesProps) => {
  // Split selectors to prevent unnecessary object creation and re-renders
  const notes = useGameStore(state => state.notes || []);
  const currentTime = useGameStore(state => state.currentTime);
  const noteSpeedMultiplier = useGameStore(state => state.noteSpeedMultiplier) || 1.0;

  const visibleNotes = React.useMemo(() => {
    if (!notes || !Array.isArray(notes)) return [];
    
    // Scale render window inversely to note speed for velocity adjustment
    // 2.0x speed: notes spawn at -2000ms (travel faster, less upcoming notes)
    // 0.5x speed: notes spawn at -8000ms (travel slower, more upcoming notes)
    const effectiveLeadTime = LEAD_TIME / noteSpeedMultiplier;
    
    // Scale failure visibility windows to match note speed
    // These ensure greyscale animations complete before note cleanup
    const failureWindowTooEarly = effectiveLeadTime; // Full approach duration
    const failureWindowMiss = effectiveLeadTime / 2; // Half approach duration (post-judgement)
    const hitCleanupWindow = 500 / noteSpeedMultiplier; // Brief cleanup period
    
    const holdNotes = notes.filter(n => n.type === 'HOLD' || n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT');
    const tapNotes = notes.filter(n => n.type === 'TAP');
    
    return notes.filter(n => {
      // For hold notes, check visibility based on note.time + note.duration, not just note.time
      const isHoldNote = n.type === 'HOLD' || n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT';
      const holdDuration = isHoldNote ? (n.duration || 1000) : 0;
      const noteStartTime = n.time;
      const noteEndTime = isHoldNote ? n.time + holdDuration : n.time;
      
      if (n.tooEarlyFailure) return noteStartTime <= currentTime + effectiveLeadTime && noteStartTime >= currentTime - failureWindowTooEarly;
      if (n.holdMissFailure || n.holdReleaseFailure) return noteStartTime <= currentTime + effectiveLeadTime && noteStartTime >= currentTime - failureWindowMiss;
      
      // For hold notes: keep visible from effectiveLeadTime before start to hitCleanupWindow after end
      // Upper bound: effectiveLeadTime before start (so it appears at vanishing point)
      // Lower bound: hitCleanupWindow after it ends (holdDuration past start)
      if (isHoldNote) {
        const isVisible = noteStartTime <= currentTime + effectiveLeadTime && noteEndTime >= currentTime - hitCleanupWindow;
        return isVisible;
      }
      
      // For normal tap notes: keep visible from effectiveLeadTime before start to hitCleanupWindow after start
      return noteStartTime <= currentTime + effectiveLeadTime && noteStartTime >= currentTime - hitCleanupWindow;
    });
  }, [notes, currentTime, noteSpeedMultiplier]);

  const processedNotes = useHoldNotes(visibleNotes, currentTime);

  return (
    <svg 
      className="absolute inset-0" 
      data-testid="hold-notes-container"
      style={{ width: `${TUNNEL_CONTAINER_WIDTH}px`, height: `${TUNNEL_CONTAINER_HEIGHT}px`, opacity: 1, pointerEvents: 'none', margin: '0 auto' }}
    >
      {processedNotes.map((noteData: any) => (
        <HoldNote key={noteData.note.id} noteData={noteData} vpX={propVpX} vpY={propVpY} />
      ))}
    </svg>
  );
};

export const HoldNotes = memo(HoldNotesComponent);
