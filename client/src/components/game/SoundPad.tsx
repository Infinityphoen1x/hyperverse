import { motion } from "framer-motion";
import padTexture from "@assets/generated_images/glowing_neon_square_drum_pad_texture.png";
import { useEffect } from "react";

interface SoundPadProps {
  onPadHit: (index: number) => void;
}

export function SoundPad({ onPadHit }: SoundPadProps) {
  
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
    <div className="grid grid-cols-4 gap-4 p-6 glass-panel rounded-xl border border-neon-pink/30 relative">
      {/* Decorative wires */}
      <div className="absolute -top-4 left-10 w-1 h-10 bg-neon-purple/50" />
      <div className="absolute -top-4 right-10 w-1 h-10 bg-neon-purple/50" />

      {[0, 1, 2, 3].map((i) => (
        <PadButton key={i} index={i} onClick={() => onPadHit(i)} />
      ))}
      
      <div className="col-span-4 flex justify-between text-xs text-muted-foreground font-rajdhani mt-2">
        <span>KEY: A</span>
        <span>KEY: S</span>
        <span>KEY: K</span>
        <span>KEY: L</span>
      </div>
    </div>
  );
}

function PadButton({ index, onClick }: { index: number; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95, brightness: 1.5 }}
      onClick={onClick}
      className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden group focus:outline-none"
      data-testid={`pad-${index}`}
    >
      <div className="absolute inset-0 bg-neon-pink/20 group-hover:bg-neon-pink/40 transition-colors" />
      
      {/* Texture */}
      <img 
        src={padTexture} 
        alt="pad" 
        className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
      />
      
      {/* Active Glow Overlay */}
      <motion.div 
        className="absolute inset-0 bg-neon-cyan/0"
        whileTap={{ backgroundColor: "rgba(0, 255, 255, 0.5)" }}
      />

      {/* Border */}
      <div className="absolute inset-0 border-2 border-neon-pink/50 rounded-lg shadow-[0_0_15px_rgba(255,0,100,0.3)] group-hover:shadow-[0_0_25px_rgba(255,0,100,0.6)] transition-shadow" />
    </motion.button>
  );
}
