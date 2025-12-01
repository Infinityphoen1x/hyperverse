// src/components/GameOverScreen.tsx
import React from 'react';
import { motion } from "framer-motion";
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game stats/actions
import { ErrorLogViewer } from "@/components/game/loaders/ErrorLogViewer";

interface GameOverScreenProps {
  onRestart?: () => void;
  score?: number;
  combo?: number;
  errors?: number;
}

export function GameOverScreen({ onRestart: propOnRestart }: GameOverScreenProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { score, combo, errors, restartGame } = useGameStore(state => ({
    score: state.score,
    combo: state.combo,
    errors: state.errors, // Or derive from error store if separate
    restartGame: propOnRestart ?? state.restartGame,
  }));

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center space-y-8">
      <h1 className="text-6xl font-orbitron text-destructive neon-text-pink">SYSTEM CRITICAL</h1>
      <div className="text-2xl font-rajdhani">
        <p>FINAL SCORE: {score}</p>
        <p>MAX COMBO: {combo}</p>
        {errors > 0 && (
          <div className="text-xs text-neon-yellow mt-4 max-h-20 overflow-y-auto">
            <p>ERRORS DETECTED: {errors}</p>
          </div>
        )}
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={restartGame}
        className="px-8 py-3 bg-neon-blue text-black font-bold hover:bg-white transition-colors"
        data-testid="button-restart-game"
      >
        REBOOT SYSTEM
      </motion.button>

      {/* Error Log Viewer for diagnostics */}
      <ErrorLogViewer />
    </div>
  );
}