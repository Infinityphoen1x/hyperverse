import { motion } from "framer-motion";

interface GameOverScreenProps {
  score: number;
  combo: number;
  errors: number;
  onRestart: () => void;
}

export function GameOverScreen({ score, combo, errors, onRestart }: GameOverScreenProps) {
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
        onClick={onRestart}
        className="px-8 py-3 bg-neon-blue text-black font-bold hover:bg-white transition-colors"
      >
        REBOOT SYSTEM
      </motion.button>
    </div>
  );
}