// src/components/DeckHoldMeters.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with notes, currentTime
import { useHoldProgress } from '@/hooks/useHoldProgress';
import { RectangleMeter } from './RectangleMeter';
import { COLOR_DECK_LEFT, COLOR_DECK_RIGHT } from '@/lib/config/gameConstants';
import type { Note } from '@/types/game';

interface DeckHoldMetersProps {
  // Optional overrides; defaults to store for global sync
  notes?: Note[];
  currentTime?: number;
}

export function DeckHoldMeters({ notes: propNotes, currentTime: propCurrentTime }: DeckHoldMetersProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { notes, currentTime } = useGameStore(state => ({
    notes: propNotes ?? state.notes,
    currentTime: propCurrentTime ?? state.currentTime,
  }));

  // Left meter (lane -1 for Q)
  const { progress: leftProgress, isGlowing: leftGlowing } = useHoldProgress({
    notes,
    currentTime,
    lane: -1,
  });

  // Right meter (lane -2 for P)
  const { progress: rightProgress, isGlowing: rightGlowing } = useHoldProgress({
    notes,
    currentTime,
    lane: -2,
  });

  return (
    <>
      <RectangleMeter
        progress={leftProgress}
        color={COLOR_DECK_LEFT}
        isGlowing={leftGlowing}
        side="left"
      />
      <RectangleMeter
        progress={rightProgress}
        color={COLOR_DECK_RIGHT}
        isGlowing={rightGlowing}
        side="right"
      />
    </>
  );
}
