// src/components/ComboDisplay.tsx
import React from 'react';
import { m } from "@/lib/motion/MotionProvider";
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game stats

interface ComboDisplayProps {
  // Optional override; defaults to store for global sync
  combo?: number;
}

export function ComboDisplay({ combo: propCombo }: ComboDisplayProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const combo = useGameStore(state => propCombo ?? state.combo);

  return (
    <div className="text-right flex items-center gap-4">
      <m.div
        className="text-3xl font-bold font-orbitron neon-glow"
        style={{ color: combo % 20 === 0 && combo > 0 ? 'hsl(120, 100%, 50%)' : 'hsl(280, 100%, 60%)' }}
        animate={combo > 0 ? { scale: [1, 1.15, 1], rotate: combo % 10 === 0 ? [0, 5, -5, 0] : 0 } : {}}
        transition={{ duration: 0.3 }}
      >
        x{combo}
      </m.div>
      <div className="text-xs text-white/50">COMBO</div>
    </div>
  );
}