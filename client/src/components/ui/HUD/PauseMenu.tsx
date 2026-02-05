// src/components/PauseMenu.tsx
import React, { memo, useState } from 'react';
import { m } from "@/lib/motion/MotionProvider";
import { useGameStore } from '@/stores/useGameStore';
import { Slider } from '@/components/ui/slider';

interface PauseMenuProps {
  onHome?: () => void;
  countdownSeconds?: number;
  onResume?: () => void;
  onRewind?: () => void;
}

const PauseMenuComponent = ({ 
  onHome: propOnHome, 
  onResume, 
  onRewind 
}: PauseMenuProps = {}) => {
  const isPaused = useGameStore(state => state.isPaused);
  const countdownSeconds = useGameStore(state => state.countdownSeconds);
  const resumeGameStore = useGameStore(state => state.resumeGame);
  const rewindGameStore = useGameStore(state => state.rewindGame);
  const playerSpeed = useGameStore(state => state.playerSpeed);
  const setPlayerSpeed = useGameStore(state => state.setPlayerSpeed);
  const setDefaultPlayerSpeed = useGameStore(state => state.setDefaultPlayerSpeed);
  
  const [showSettings, setShowSettings] = useState(false);

  // Prefer props if available for complex logic (countdown, async seek), fallback to store
  const handleResume = onResume || resumeGameStore;
  const handleRewind = onRewind || rewindGameStore;
  
  const handleSpeedChange = (value: number[]) => {
    setPlayerSpeed(value[0]);
    setDefaultPlayerSpeed(value[0]); // Also persist the change
  };

  if (!isPaused) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="pause-menu-container">
      <div className="text-center space-y-8">
        {countdownSeconds > 0 ? (
          <>
            <m.div
              className="text-9xl font-orbitron text-neon-cyan neon-glow"
              animate={{ scale: [1, 1.2, 1], textShadow: ['0 0 20px hsl(180, 100%, 50%)', '0 0 40px hsl(180, 100%, 50%)', '0 0 20px hsl(180, 100%, 50%)'] }}
              transition={{ duration: 1, repeat: Infinity }}
              key={countdownSeconds}
              data-testid="countdown-display"
            >
              {countdownSeconds}
            </m.div>
            <p className="text-neon-cyan font-rajdhani text-lg" data-testid="text-get-ready">GET READY!</p>
          </>
        ) : (
          <>
            <h1 className="text-6xl font-orbitron text-neon-cyan neon-glow" data-testid="text-paused">PAUSED</h1>
            <p className="text-neon-cyan font-rajdhani text-lg" data-testid="text-resume-hint">Press ESC to resume</p>
          </>
        )}
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-black/90 border border-neon-cyan p-6 rounded-lg space-y-4 max-w-md mx-auto">
            <h3 className="text-neon-cyan font-orbitron text-xl">NOTE SPEED</h3>
            <Slider
              value={[playerSpeed]}
              onValueChange={handleSpeedChange}
              min={5}
              max={40}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs font-rajdhani text-white/60">
              <span>Slower (5)</span>
              <span className="text-neon-pink font-bold">{playerSpeed.toFixed(0)}</span>
              <span>Faster (40)</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-4 mt-8">
          <button
            onClick={handleResume}
            disabled={countdownSeconds > 0}
            className="px-12 py-4 bg-neon-cyan text-black font-bold font-orbitron text-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-resume"
          >
            {countdownSeconds > 0 ? 'RESUMING...' : 'RESUME'}
          </button>
          <button
            onClick={handleRewind}
            className="px-12 py-4 bg-emerald-500 text-black font-bold font-orbitron text-lg hover:bg-white transition-colors border-2 border-emerald-500"
            data-testid="button-rewind"
          >
            REWIND
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-12 py-4 bg-purple-500 text-black font-bold font-orbitron text-lg hover:bg-white transition-colors border-2 border-purple-500"
            data-testid="button-settings"
          >
            {showSettings ? 'HIDE SETTINGS' : 'SETTINGS'}
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