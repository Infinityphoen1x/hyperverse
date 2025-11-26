import { motion, AnimatePresence } from "framer-motion";
import padTexture from "@assets/generated_images/glowing_neon_square_drum_pad_texture.png";
import { useEffect } from "react";
import { Note } from "@/lib/gameEngine";

interface SoundPadProps {
  onPadHit: (index: number) => void;
  notes: Note[];
  currentTime: number;
}

export function SoundPad({ onPadHit, notes, currentTime }: SoundPadProps) {
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      // Add visual feedback class to body or specific element if needed, 
      // but here we trigger the hit.
      switch (key) {
        case 'a': onPadHit(0); break;
        case 's': onPadHit(1); break;
        case 'k': onPadHit(2); break;
        case 'l': onPadHit(3); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPadHit]);

  return (
    <div className="p-8 glass-panel rounded-xl border border-neon-pink/30 relative bg-black/40">
      {/* Decorative wires */}
      <div className="absolute -top-4 left-10 w-1 h-10 bg-neon-purple/50" />
      <div className="absolute -top-4 right-10 w-1 h-10 bg-neon-purple/50" />

      {/* Grid Container - Increased gap and ensured no overlap */}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <PadButton 
              index={i} 
              onClick={() => onPadHit(i)} 
              notes={notes.filter(n => n.lane === i && !n.hit && !n.missed)}
              currentTime={currentTime}
            />
            <div className="text-xs text-muted-foreground font-rajdhani font-bold tracking-wider">
              KEY: {['A', 'S', 'K', 'L'][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PadButton({ index, onClick, notes, currentTime }: { index: number; onClick: () => void; notes: Note[]; currentTime: number }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative w-24 h-24 md:w-28 md:h-28 rounded-xl group focus:outline-none"
      data-testid={`pad-${index}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Pad Background - Individual Texture Usage */}
      <div className="absolute inset-0 rounded-xl overflow-hidden border-2 border-neon-pink/30 bg-black/50 shadow-[0_0_15px_rgba(255,0,100,0.1)] group-hover:shadow-[0_0_25px_rgba(255,0,100,0.4)] group-hover:border-neon-pink/60 transition-all duration-200">
        <img 
          src={padTexture} 
          alt="pad-texture" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-hard-light"
        />
        {/* Inner glow gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20" />
      </div>

      {/* Judgement Rings Overlay */}
      <AnimatePresence>
        {notes.map(note => {
          const timeUntilHit = note.time - currentTime;
          // Show ring when within 1000ms
          if (timeUntilHit > 1000 || timeUntilHit < -200) return null;
          
          // 1000ms out -> scale 2.0
          // 0ms -> scale 1.0
          // We want it to shrink onto the button
          const scale = 1 + (timeUntilHit / 1000);

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: scale }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0 }} // Driven by state updates
              className="absolute inset-[-10px] border-4 border-neon-cyan rounded-xl pointer-events-none z-20 shadow-[0_0_10px_cyan]"
              style={{ scale }}
            />
          );
        })}
      </AnimatePresence>

      {/* Hit Flash */}
      <motion.div 
        className="absolute inset-0 bg-neon-cyan/0 rounded-xl mix-blend-overlay"
        whileTap={{ backgroundColor: "rgba(0, 255, 255, 0.8)" }}
      />
    </motion.button>
  );
}
