// src/components/DeckHoldMeters.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with notes, currentTime
import { useHoldProgress } from '@/hooks/useHoldProgress';
import { RectangleMeter } from '@/components/RectangleMeter';
import { COLOR_DECK_LEFT, COLOR_DECK_RIGHT } from '@/lib/config/gameConstants';

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
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-green font-bold tracking-widest">Q</div>
        <RectangleMeter
          progress={leftProgress}
          outlineColor={COLOR_DECK_LEFT}
          lane={-1}
          isGlowing={leftGlowing}
        />
      </div>
      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-red font-bold tracking-widest">P</div>
        <RectangleMeter
          progress={rightProgress}
          outlineColor={COLOR_DECK_RIGHT}
          lane={-2}
          isGlowing={rightGlowing}
        />
      </div>
    </div>
  );
}