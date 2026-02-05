// src/hooks/useHoldProgress.ts
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { getHoldProgress } from '@/lib/utils/holdMeterUtils';
import { 
  DECK_METER_COMPLETION_GLOW_DURATION,
  DECK_METER_COMPLETION_THRESHOLD,
  DECK_METER_DEFAULT_HOLD_DURATION
} from '@/lib/config';

interface UseHoldProgressProps {
  lane?: number; // Position value (-2 to 3)
}

interface HoldProgressReturn {
  progress: number;
  isGlowing: boolean;
}

export const useHoldProgress = ({ lane: propLane }: UseHoldProgressProps = {}): HoldProgressReturn => {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  const playerSpeed = useGameStore(state => state.playerSpeed) || 20;
  const lane = propLane ?? -1; // Default to horizontal position -1

  const [isGlowing, setIsGlowing] = useState(false);
  const prevCompletionRef = useRef<boolean>(false);
  const prevActiveNoteIdRef = useRef<string>('');
  const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const activeNote = notes.find(n => n.lane === lane && !n.hit);
    const currentNoteId = activeNote?.id || '';

    if (prevActiveNoteIdRef.current !== currentNoteId) {
      prevCompletionRef.current = false;
      setIsGlowing(false);
      prevActiveNoteIdRef.current = currentNoteId;
    }
  }, [notes, lane]);

  // Calculate progress purely for rendering
  const progress = getHoldProgress(
    notes,
    currentTime,
    lane,
    DECK_METER_COMPLETION_THRESHOLD,
    DECK_METER_DEFAULT_HOLD_DURATION,
    playerSpeed
  );

  // Handle side effects (glow) in useEffect
  useEffect(() => {
    const shouldGlow = progress >= DECK_METER_COMPLETION_THRESHOLD && !prevCompletionRef.current;
    
    if (shouldGlow) {
      setIsGlowing(true);
      prevCompletionRef.current = true;
      
      if (glowTimeoutRef.current) clearTimeout(glowTimeoutRef.current);
      glowTimeoutRef.current = setTimeout(() => setIsGlowing(false), DECK_METER_COMPLETION_GLOW_DURATION);
    } else if (progress < DECK_METER_COMPLETION_THRESHOLD) {
      // Reset completion flag if progress drops (e.g. new note or reset)
      // Only if we are tracking the same note, which is handled by the other useEffect resetting on note ID change
      // But we might want to double check here if we need to reset prevCompletion for the same note if it somehow rewinds?
      // For now, just relying on note ID change is safer to avoid flickering.
      if (progress === 0) {
          prevCompletionRef.current = false;
      }
    }
  }, [progress]);

  return { progress, isGlowing };
};