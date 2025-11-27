import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { BeatmapLoader } from "@/components/game/BeatmapLoader";

export default function Home() {
  const [selectedDifficulty, setSelectedDifficulty] = useState('MEDIUM');

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Beatmap Loader - for loading YouTube before starting */}
      <BeatmapLoader 
        difficulty={selectedDifficulty as 'EASY' | 'MEDIUM' | 'HARD'}
        onBeatmapLoad={() => {}}
      />
      {/* Background FX */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center space-y-12"
      >
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-white to-neon-pink neon-text-blue">
            NEON SYNC
          </h1>
          <p className="text-neon-cyan font-rajdhani tracking-[0.5em] text-xl uppercase">
            Cyberpunk DJ Simulator
          </p>
        </div>

        <div className="flex flex-col gap-4 w-64 mx-auto">
          {['EASY', 'MEDIUM', 'HARD'].map((diff) => (
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

        <Link href={`/game?difficulty=${selectedDifficulty}`}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-8 px-12 py-6 bg-neon-cyan text-black font-bold text-2xl font-orbitron rounded-sm shadow-[0_0_50px_cyan] border-2 border-white hover:bg-white transition-colors"
          >
            START SESSION
          </motion.button>
        </Link>
      </motion.div>
      
      {/* Footer */}
      <div className="absolute bottom-8 text-white/30 text-xs font-mono">
        SYSTEM_READY // V.1.0.0 // REPLIT_MOCKUP
      </div>
    </div>
  );
}
