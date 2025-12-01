// src/components/PauseMenu.tsx
import React, { memo } from 'react';
import { motion } from "framer-motion";
import { useGameStore } from '@/stores/useGameStore';

interface PauseMenuProps {
  onHome?: () => void;
  countdownSeconds?: number;
  onResume?: () => void;
  onRewind?: () => void;
}

const PauseMenuComponent = ({ onHome: propOnHome }: PauseMenuProps = {}) => {
  const { 
    isPaused, 
    countdownSeconds, 
    resumeGame, 
    rewindGame
  } = useGameStore(state => ({
    isPaused: state.isPaused,
    countdownSeconds: state.countdownSeconds,
    resumeGame: state.resumeGame,
    rewindGame: state.rewindGame,
  }));

  if (!isPaused) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="pause-menu-container">
      <div className="text-center space-y-8">
        {countdownSeconds > 0 ? (
          <>
            <motion.div
              className="text-9xl font-orbitron text-neon-cyan neon-glow"
              animate={{ scale: [1, 1.2, 1], textShadow: ['0 0 20px hsl(180, 100%, 50%)', '0 0 40px hsl(180, 100%, 50%)', '0 0 20px hsl(180, 100%, 50%)'] }}
              transition={{ duration: 1, repeat: Infinity }}
              key={countdownSeconds}
              data-testid="countdown-display"
            >
              {countdownSeconds}
            </motion.div>
            <p className="text-neon-cyan font-rajdhani text-lg" data-testid="text-get-ready">GET READY!</p>
          </>
        ) : (
          <>
            <h1 className="text-6xl font-orbitron text-neon-cyan neon-glow" data-testid="text-paused">PAUSED</h1>
            <p className="text-neon-cyan font-rajdhani text-lg" data-testid="text-resume-hint">Press ESC to resume</p>
          </>
        )}
        <div className="flex flex-col gap-4 mt-8">
          <button
            onClick={resumeGame}
            disabled={countdownSeconds > 0}
            className="px-12 py-4 bg-neon-cyan text-black font-bold font-orbitron text-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-resume"
          >
            {countdownSeconds > 0 ? 'RESUMING...' : 'RESUME'}
          </button>
          <button
            onClick={rewindGame}
            className="px-12 py-4 bg-emerald-500 text-black font-bold font-orbitron text-lg hover:bg-white transition-colors border-2 border-emerald-500"
            data-testid="button-rewind"
          >
            REWIND
          </button>
          {propOnHome && (
            <button
              onClick={propOnHome}
              className="px-12 py-4 bg-neon-pink text-black font-bold font-orbitron text-lg hover:bg-white transition-colors"
              data-testid="button-sever-node"
            >
              SEVER NODE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const PauseMenu = memo(PauseMenuComponent);