// src/components/ScoreDisplay.tsx
import React from 'react';
import { motion } from "framer-motion";
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game stats

interface ScoreDisplayProps {
  // Optional override; defaults to store for global sync
  score?: string;
}

export function ScoreDisplay({ score: propScore }: ScoreDisplayProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const score = useGameStore(state => propScore ?? state.score.toString());

  return (
    <div className="text-center">
      <motion.h2
        className="text-4xl font-orbitron text-white tracking-widest tabular-nums neon-glow"
        animate={parseInt(score) % 500 === 0 && parseInt(score) > 0 ? { scale: [1, 1.2, 1], textShadow: ['0 0 10px white', '0 0 30px hsl(320, 100%, 60%)', '0 0 10px white'] } : {}}
        transition={{ duration: 0.3 }}
      >
        {score}
      </motion.h2>
      <p className="text-neon-pink font-rajdhani text-sm tracking-[0.5em] uppercase">score</p>
    </div>
  );
}