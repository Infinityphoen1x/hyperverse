// src/hooks/useHoldProgress.ts
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/types/game';
import { getHoldProgress } from '@/lib/utils/holdMeterUtils';
import { DECK_METER_COMPLETION_GLOW_DURATION } from '@/lib/config/gameConstants';

interface UseHoldProgressProps {
  lane?: number;
}

interface HoldProgressReturn {
  progress: number;
  isGlowing: boolean;
}

export const useHoldProgress = ({ lane: propLane }: UseHoldProgressProps = {}): HoldProgressReturn => {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  const lane = propLane ?? -1;

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

  useEffect(() => {
    const result = getHoldProgress(
      notes,
      currentTime,
      lane,
      prevCompletionRef.current,
      setIsGlowing,
      glowTimeoutRef,
      DECK_METER_COMPLETION_GLOW_DURATION
    );

    prevCompletionRef.current = result.prevCompletion;
  }, [notes, currentTime, lane]);

  const { progress } = getHoldProgress(
    notes,
    currentTime,
    lane,
    prevCompletionRef.current,
    setIsGlowing,
    glowTimeoutRef,
    DECK_METER_COMPLETION_GLOW_DURATION
  );

  return { progress, isGlowing };
};