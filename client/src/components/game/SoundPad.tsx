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
      switch (e.key) {
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
    <div className="grid grid-cols-4 gap-6 p-8 glass-panel rounded-xl border border-neon-pink/30 relative bg-black/40">
      {/* Decorative wires */}
      <div className="absolute -top-4 left-10 w-1 h-10 bg-neon-purple/50" />
      <div className="absolute -top-4 right-10 w-1 h-10 bg-neon-purple/50" />

      {[0, 1, 2, 3].map((i) => (
        <PadButton 
          key={i} 
          index={i} 
          onClick={() => onPadHit(i)} 
          notes={notes.filter(n => n.lane === i && !n.hit && !n.missed)}
          currentTime={currentTime}
        />
      ))}
      
      <div className="col-span-4 flex justify-between text-xs text-muted-foreground font-rajdhani mt-2 px-2">
        <span>KEY: A</span>
        <span>KEY: S</span>
        <span>KEY: K</span>
        <span>KEY: L</span>
      </div>
    </div>
  );
}

function PadButton({ index, onClick, notes, currentTime }: { index: number; onClick: () => void; notes: Note[]; currentTime: number }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg group focus:outline-none"
      data-testid={`pad-${index}`}
    >
      {/* Pad Background */}
      <div className="absolute inset-0 bg-neon-pink/20 group-hover:bg-neon-pink/40 transition-colors rounded-lg overflow-hidden border border-neon-pink/30">
        <img 
          src={padTexture} 
          alt="pad" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
        />
      </div>

      {/* Judgement Rings Overlay */}
      <AnimatePresence>
        {notes.map(note => {
          const timeUntilHit = note.time - currentTime;
          // Show ring when within 1000ms
          if (timeUntilHit > 1000 || timeUntilHit < -200) return null;
          
          // 1000ms out -> scale 2.0
          // 0ms -> scale 1.0
          const scale = 1 + (timeUntilHit / 1000);

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: scale }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0 }} // Driven by state updates
              className="absolute inset-0 border-4 border-neon-cyan rounded-lg pointer-events-none z-20 shadow-[0_0_10px_cyan]"
              style={{ scale }}
            />
          );
        })}
      </AnimatePresence>

      {/* Hit Flash */}
      <motion.div 
        className="absolute inset-0 bg-neon-cyan/0 rounded-lg"
        whileTap={{ backgroundColor: "rgba(0, 255, 255, 0.5)" }}
      />
    </motion.button>
  );
}
