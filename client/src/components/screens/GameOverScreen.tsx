// src/components/GameOverScreen.tsx
import React, { memo } from 'react';
import { m } from "@/lib/motion/MotionProvider";
import { useGameStore } from '@/stores/useGameStore';
import { ErrorLogViewer } from "@/components/game/loaders/ErrorLogViewer";

interface GameOverScreenProps {
  onRestart?: () => void;
  score?: number;
  combo?: number;
  errorCount?: number;
}

const GameOverScreenComponent = ({ onRestart: propOnRestart, errorCount: propErrorCount = 0 }: GameOverScreenProps = {}) => {
  const { score, combo, restartGame } = useGameStore(state => ({
    score: state.score,
    combo: state.combo,
    restartGame: propOnRestart ?? state.restartGame,
  }));

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center space-y-8">
      <h1 className="text-6xl font-orbitron text-destructive neon-text-pink" data-testid="text-game-over-title">SYSTEM CRITICAL</h1>
      <div className="text-2xl font-rajdhani">
        <p data-testid="text-final-score">FINAL SCORE: {score}</p>
        <p data-testid="text-max-combo">MAX COMBO: {combo}</p>
        {propErrorCount > 0 && (
          <div className="text-xs text-neon-yellow mt-4 max-h-20 overflow-y-auto">
            <p data-testid="text-errors-detected">ERRORS DETECTED: {propErrorCount}</p>
          </div>
        )}
      </div>
      <m.button
        whileHover={{ scale: 1.05 }}
        onClick={restartGame}
        className="px-8 py-3 bg-neon-blue text-black font-bold hover:bg-white transition-colors"
        data-testid="button-restart-game"
      >
        REBOOT SYSTEM
      </m.button>

      <ErrorLogViewer />
    </div>
  );
};

export const GameOverScreen = memo(GameOverScreenComponent);