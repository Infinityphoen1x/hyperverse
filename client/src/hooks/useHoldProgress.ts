// src/hooks/useHoldProgress.ts
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game state
import { Note } from '@/lib/engine/gameTypes';
import { getHoldProgress, HoldProgressData } from '@/lib/utils/holdMeterUtils';
import { DECK_METER_COMPLETION_GLOW_DURATION } from '@/lib/config/gameConstants';

interface UseHoldProgressProps {
  // Optional overrides; defaults to store for global sync
  lane?: number;
}

interface HoldProgressReturn {
  progress: number;
  isGlowing: boolean;
}

export const useHoldProgress = ({ lane: propLane }: UseHoldProgressProps = {}): HoldProgressReturn => {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { notes, currentTime } = useGameStore(state => ({
    notes: state.notes,
    currentTime: state.currentTime,
  }));
  const lane = propLane ?? -1; // Default to left lane if not specified; adjust as needed

  const [isGlowing, setIsGlowing] = useState(false);
  const prevCompletionRef = useRef<boolean>(false);
  const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up glow timeout on unmount
  useEffect(() => {
    return () => {
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
    };
  }, []);

  // Detect note changes and reset glow
  useEffect(() => {
    if (!Array.isArray(notes)) return;

    const activeNote = notes.find(n => n.lane === lane && n.pressHoldTime && n.pressHoldTime > 0 && !n.hit);
    const currentNoteId = activeNote?.id || '';

    if (prevActiveNoteIdRef.current !== currentNoteId) {
      prevCompletionRef.current = false;
      setIsGlowing(false);
      prevActiveNoteIdRef.current = currentNoteId;
    }
  }, [notes, lane]);

  // Compute progress (runs on currentTime/notes changes)
  const { progress, shouldGlow, prevCompletion } = getHoldProgress(
    notes,
    currentTime,
    lane,
    prevCompletionRef.current,
    setIsGlowing,
    glowTimeoutRef,
    DECK_METER_COMPLETION_GLOW_DURATION
  );

  // Update ref for next calc
  prevCompletionRef.current = prevCompletion;

  return { progress, isGlowing };
};