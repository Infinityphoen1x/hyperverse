import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { BeatmapLoader } from "@/components/game/loaders/BeatmapLoader";
import { BeatmapData } from "@/lib/beatmap/beatmapParser";
import { useGameStore } from "@/stores/useGameStore";
import { audioManager } from "@/lib/audio/audioManager";

interface HomeProps {
  onStartGame: (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => void;
  onOpenSettings: () => void;
}

export default function Home({ onStartGame, onOpenSettings }: HomeProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isLoaderOpen, setIsLoaderOpen] = useState(false);
  const [beatmapLoaded, setBeatmapLoaded] = useState(false);
  const unloadBeatmap = useGameStore(state => state.unloadBeatmap);

  const colors = ["#00FFFF", "#FF00FF", "#00FF00", "#00CCFF", "#FF0080"];
  const [colorIndex, setColorIndex] = useState(0);

  // Check if beatmap is already loaded in localStorage on mount and when returning from game
  useEffect(() => {
    const pendingBeatmap = localStorage.getItem('pendingBeatmap');
    if (pendingBeatmap) {
      try {
        const beatmapData = JSON.parse(pendingBeatmap);
        if (beatmapData.youtubeVideoId && beatmapData.beatmapText) {
          setBeatmapLoaded(true);
        } else {
          setBeatmapLoaded(false);
        }
      } catch {
        setBeatmapLoaded(false);
      }
    } else {
      setBeatmapLoaded(false);
    }
  }, []);

  const bannerMessages = [
    { text: "[ENCRYPTING NEURAL PATHWAYS] • QUANTUM SYNC PROTOCOL ACTIVE • SYNCHRONIZING BRAINWAVES", color: "#00FFFF" },
    { text: "[NEURAL INTERFACE ONLINE] • FREQUENCY LOCKED • HARMONIC RESONANCE DETECTED", color: "#FF00FF" },
    { text: "[DECRYPTION IN PROGRESS] • SYSTEM CALIBRATION COMPLETE • AWAITING INPUT SIGNAL", color: "#00FF00" },
    { text: "[GATEWAY INITIALIZED] • DIMENSIONAL BREACH IMMINENT • CONSCIOUSNESS UPLOADING", color: "#00CCFF" },
    { text: "[NEURAL SYNC: 99%] • QUANTUM ENTANGLEMENT SUCCESSFUL • READY FOR TRANSCENDENCE", color: "#FF0080" },
  ];

  // Create continuous scrolling text - repeat 3x for seamless infinite scroll with no gaps
  const baseText = bannerMessages.map(m => m.text).join(" • ");
  const continuousText = baseText + " • " + baseText + " • " + baseText + " • ";

  // Cycle through colors
  useEffect(() => {
    const colorInterval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 2000); // Change color every 2 seconds
    return () => clearInterval(colorInterval);
  }, [colors.length]);

  const handleBeatmapLoad = (data: BeatmapData, beatmapText: string) => {
    // Clear old beatmap first to prevent conflicts
    unloadBeatmap();
    
    // Store full beatmap TEXT (not parsed notes) so Game can re-parse with any difficulty
    const beatmapStorageData = { 
      youtubeVideoId: data.youtubeVideoId,
      beatmapText: beatmapText
    };
    localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapStorageData));
    setBeatmapLoaded(true);
    setIsLoaderOpen(false); // Auto-close the loader
  };

  const handleUnloadBeatmap = () => {
    unloadBeatmap();
    setBeatmapLoaded(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Beatmap Loader */}
      <BeatmapLoader 
        difficulty={selectedDifficulty}
        isOpen={isLoaderOpen}
        setIsOpen={setIsLoaderOpen}
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
          {/* Animated scrolling banner */}
          <div 
            className="w-full max-w-2xl mx-auto border-3 px-6 py-4 overflow-hidden bg-black/30 relative transition-colors duration-300"
            style={{ borderColor: colors[colorIndex] }}
          >
            {/* Gradient fade edges for smooth scroll effect */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r to-transparent z-10"
              style={{ backgroundImage: `linear-gradient(to right, rgb(0, 0, 0), transparent)` }}
            />
            <div 
              className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l to-transparent z-10"
              style={{ backgroundImage: `linear-gradient(to left, rgb(0, 0, 0), transparent)` }}
            />
            
            <motion.div
              className="font-rajdhani text-xl uppercase whitespace-nowrap font-semibold tracking-wider"
              style={{ color: colors[colorIndex] }}
              initial={{ x: 0 }}
              animate={{ x: -baseText.length * 8 - 12 }}
              transition={{ duration: 35, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
            >
              {continuousText}
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-64 mx-auto">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
            <button
              key={diff}
              onClick={() => {
                audioManager.play('difficultySettingsApply');
                setSelectedDifficulty(diff);
              }}
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

        <div className="flex gap-4 justify-center items-center flex-nowrap flex-wrap">
          <motion.button 
            onClick={() => {
              audioManager.play('startSession');
              onStartGame(selectedDifficulty);
            }}
            disabled={!beatmapLoaded}
            whileHover={beatmapLoaded ? { scale: 1.05 } : {}}
            whileTap={beatmapLoaded ? { scale: 0.95 } : {}}
            className={`px-12 py-6 text-black font-bold text-xl font-orbitron rounded-sm border-2 transition-colors whitespace-nowrap ${
              beatmapLoaded
                ? 'bg-neon-pink shadow-[0_0_50px_rgba(255,0,127,0.8)] border-neon-pink cursor-pointer'
                : 'bg-neon-cyan shadow-[0_0_50px_cyan] border-white hover:bg-white opacity-50 cursor-not-allowed'
            }`}
            data-testid="button-start-session"
          >
            START SESSION
          </motion.button>
          
          {beatmapLoaded && (
            <>
              <motion.button 
                onClick={() => { 
                  audioManager.play('difficultySettingsApply');
                  setIsLoaderOpen(true); 
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-6 text-white font-bold font-orbitron rounded-sm border-2 border-neon-cyan bg-transparent hover:bg-neon-cyan/10 transition-colors text-sm whitespace-nowrap"
                data-testid="button-load-new-beatmap"
              >
                LOAD NEW
              </motion.button>
              
              <motion.button 
                onClick={() => {
                  audioManager.play('difficultySettingsApply');
                  handleUnloadBeatmap();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-6 text-white font-bold font-orbitron rounded-sm border-2 border-red-500/50 bg-transparent hover:bg-red-500/10 hover:border-red-500 transition-colors text-sm whitespace-nowrap"
                data-testid="button-unload-beatmap"
              >
                UNLOAD
              </motion.button>
            </>
          )}

          <motion.button 
            onClick={() => {
              audioManager.play('difficultySettingsApply');
              onOpenSettings();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-6 text-white font-bold font-orbitron rounded-sm border-2 border-white/30 bg-transparent hover:border-neon-cyan hover:text-neon-cyan transition-colors text-sm whitespace-nowrap"
            data-testid="button-open-settings"
          >
            ⚙ SETTINGS
          </motion.button>
        </div>
      </motion.div>
      
      {/* Footer */}
      <div className="absolute bottom-8 text-white/30 text-xs font-mono z-20">
        SYSTEM_READY // V.1.2.0 // REPLIT_MOCKUP
      </div>
    </div>
  );
}
