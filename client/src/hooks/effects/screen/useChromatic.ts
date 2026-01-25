// src/hooks/useChromatic.ts
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game stats
import { COMBO_MILESTONE, CHROMATIC_INTENSITY, CHROMATIC_DURATION } from '@/lib/config';

interface UseChromaticProps {
  // Optional override; defaults to store for global sync
  combo?: number;
}

export const useChromatic = ({ combo: propCombo }: UseChromaticProps = {}): number => {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const combo = useGameStore(state => propCombo ?? state.combo);

  const [intensity, setIntensity] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset effect when combo drops to 0 (restart/rewind)
  useEffect(() => {
    if (combo === 0) {
      setIntensity(0);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [combo]);

  useEffect(() => {
    if (combo > 0 && combo % COMBO_MILESTONE === 0) {
      setIntensity(CHROMATIC_INTENSITY);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIntensity(0), CHROMATIC_DURATION);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [combo]);

  return intensity;
};