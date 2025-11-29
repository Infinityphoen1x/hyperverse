import { motion } from "framer-motion";
import { useState } from "react";
import { BeatmapLoader } from "@/components/game/BeatmapLoader";

interface HomeProps {
  onStartGame: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
}

export default function Home({ onStartGame }: HomeProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [beatmapLoaded, setBeatmapLoaded] = useState(false);

  const handleBeatmapLoad = (youtubeVideoId?: string, notes?: any[]) => {
    // Store beatmap data for the game to use
    const beatmapData = { youtubeVideoId, notes, difficulty: selectedDifficulty };
    localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
    setBeatmapLoaded(true);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Beatmap Loader */}
      <BeatmapLoader 
        difficulty={selectedDifficulty as 'EASY' | 'MEDIUM' | 'HARD'}
        onBeatmapLoad={handleBeatmapLoad}
      />
      {/* Semi-transparent overlay to show video behind */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      {/* Background FX */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-1" />
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.01] pointer-events-none z-1" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-20 text-center space-y-12 relative"
      >
        <div className="space-y-4">
          <h1 
            className="text-6xl md:text-8xl font-black font-orbitron"
            style={{
              background: 'linear-gradient(45deg, #00FFFF, #FF00FF)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.6))',
            }}
          >
            HYPERVERSE
          </h1>
          <p className="text-neon-cyan font-rajdhani tracking-[0.5em] text-xl uppercase">
            [ENCRYPTING NEURAL PATHWAYS] // QUANTUM SYNC PROTOCOL
          </p>
        </div>

        <div className="flex flex-col gap-4 w-64 mx-auto">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`
                px-8 py-4 rounded-none border transition-all duration-300 font-orbitron tracking-widest
                ${selectedDifficulty === diff 
                  ? 'bg-neon-pink text-black border-neon-pink shadow-[0_0_30px_rgba(255,0,100,0.5)] scale-105' 
                  : 'bg-transparent text-white border-white/20 hover:border-neon-pink/50 hover:text-neon-pink'}
              `}
            >
              {diff}
            </button>
          ))}
        </div>

        <motion.button 
          onClick={() => onStartGame(selectedDifficulty)}
          disabled={!beatmapLoaded}
          whileHover={beatmapLoaded ? { scale: 1.05 } : {}}
          whileTap={beatmapLoaded ? { scale: 0.95 } : {}}
          className={`mt-8 px-12 py-6 text-black font-bold text-2xl font-orbitron rounded-sm border-2 transition-colors ${
            beatmapLoaded
              ? 'bg-neon-pink shadow-[0_0_50px_rgba(255,0,127,0.8)] border-neon-pink cursor-pointer'
              : 'bg-neon-cyan shadow-[0_0_50px_cyan] border-white hover:bg-white opacity-50 cursor-not-allowed'
          }`}
          data-testid="button-start-session"
        >
          START SESSION {beatmapLoaded && '● BEATMAP READY'}
        </motion.button>
      </motion.div>
      
      {/* Footer */}
      <div className="absolute bottom-8 text-white/30 text-xs font-mono z-20">
        SYSTEM_READY // V.1.2.0 // REPLIT_MOCKUP
      </div>
    </div>
  );
}
