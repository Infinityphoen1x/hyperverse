import { motion } from "framer-motion";
import { useGameStore } from "@/stores/useGameStore";
import { Slider } from "@/components/ui/slider";

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const noteSpeedMultiplier = useGameStore(state => state.noteSpeedMultiplier);
  const setNoteSpeedMultiplier = useGameStore(state => state.setNoteSpeedMultiplier);

  const handleSpeedChange = (value: number[]) => {
    setNoteSpeedMultiplier(value[0]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-1" />
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.01] pointer-events-none z-1" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-20 text-center space-y-12 relative max-w-md w-full px-8"
      >
        <div className="space-y-4">
          <h1 
            className="text-6xl font-black font-orbitron"
            style={{
              background: 'linear-gradient(45deg, #00FFFF, #FF00FF)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.6))',
            }}
          >
            SETTINGS
          </h1>
          <p className="text-white/60 font-rajdhani">Customize your gameplay</p>
        </div>

        <div className="space-y-6 bg-black/30 border border-neon-cyan/30 px-8 py-8 rounded-sm">
          {/* Note Speed Setting */}
          <div className="space-y-4">
            <label className="text-white font-orbitron text-sm tracking-widest block">
              NOTE SPEED
            </label>
            <div className="space-y-3">
              <Slider
                value={[noteSpeedMultiplier]}
                onValueChange={handleSpeedChange}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs font-rajdhani text-white/60">
                <span>0.5x</span>
                <span className="text-neon-pink font-bold">{noteSpeedMultiplier.toFixed(1)}x</span>
                <span>2.0x</span>
              </div>
            </div>
            <p className="text-xs text-white/40 font-rajdhani mt-2">
              Controls how fast notes travel. Does not affect hit timing or YouTube sync.
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <motion.button 
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-12 py-4 bg-neon-pink text-black font-bold text-lg font-orbitron rounded-sm border-2 border-neon-pink shadow-[0_0_50px_rgba(255,0,127,0.8)] transition-colors whitespace-nowrap"
            data-testid="button-apply-settings"
          >
            APPLY
          </motion.button>
          
          <motion.button 
            onClick={onBack}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-12 py-4 bg-transparent text-white font-bold text-lg font-orbitron rounded-sm border-2 border-white/30 hover:border-neon-cyan hover:text-neon-cyan transition-colors whitespace-nowrap"
            data-testid="button-cancel-settings"
          >
            BACK
          </motion.button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-8 text-white/30 text-xs font-mono z-20">
        SYSTEM_SETTINGS // V.1.2.0
      </div>
    </div>
  );
}
