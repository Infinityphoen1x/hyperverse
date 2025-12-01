// src/components/HealthDisplay.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game stats
import { MAX_HEALTH } from '@/lib/config/gameConstants'; // Assuming MAX_HEALTH=200 from prior

interface HealthDisplayProps {
  // Optional override; defaults to store for global sync
  health?: number;
}

export function HealthDisplay({ health: propHealth }: HealthDisplayProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const health = useGameStore(state => propHealth ?? state.health);

  const healthPercent = Math.floor((health / MAX_HEALTH) * 100);

  return (
    <>
      <div className="w-12 h-12 rounded-full border-2 border-neon-cyan flex items-center justify-center text-neon-cyan font-bold">
        {healthPercent}%
      </div>
      <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-neon-cyan transition-all duration-300"
          style={{ width: `${healthPercent}%` }}
        />
      </div>
    </>
  );
}