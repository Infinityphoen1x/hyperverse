import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Note, GameErrors } from "@/lib/gameEngine";

const ACTIVATION_WINDOW = 300; // ms - must hit within this window of note.time

const PAD_COLORS = [
  'rgb(255,0,127)',   // W - pink (lane 0)
  'rgb(0,150,255)',   // O - blue (lane 1)
  'rgb(190,0,255)',   // I - purple (lane 2)
  'rgb(0,255,255)'    // E - cyan (lane 3)
];

const PAD_STYLES = [
  { bg: 'bg-neon-pink/30', border: 'border-neon-pink/50', shadow: 'shadow-[0_0_15px_rgb(255,0,127)]' },
  { bg: 'bg-neon-blue/30', border: 'border-neon-blue/50', shadow: 'shadow-[0_0_15px_rgb(0,150,255)]' },
  { bg: 'bg-neon-cyan/30', border: 'border-neon-cyan/50', shadow: 'shadow-[0_0_15px_rgb(0,255,255)]' },
  { bg: 'bg-neon-purple/30', border: 'border-neon-purple/50', shadow: 'shadow-[0_0_15px_rgb(190,0,255)]' },
];

interface SoundPadProps {
  onPadHit: (index: number) => void;
  notes: Note[];
  currentTime: number;
}

export function SoundPad({ onPadHit, notes, currentTime }: SoundPadProps) {
  
  // Shared Hit Logic for Feedback
  const checkHitAndFeedback = (index: number) => {
    try {
      if (!Number.isFinite(index) || index < 0 || index > 3) {
        GameErrors.log(`SoundPad: Invalid pad index ${index}`);
        return;
      }
      
      onPadHit(index);
      
      // Check for visual feedback (simulated "good" hit)
      if (!Array.isArray(notes)) {
        GameErrors.log(`SoundPad: Notes is not an array`);
        return;
      }
      
      const laneNotes = notes.filter(n => 
        n && Number.isFinite(n.lane) && n.lane === index
      );
      const hasHittableNote = laneNotes.some(n => 
        n && !n.hit && !n.missed && !n.tapMissFailure && Number.isFinite(n.time) && Math.abs(n.time - currentTime) < ACTIVATION_WINDOW
      );
      
      if (hasHittableNote) {
        window.dispatchEvent(new CustomEvent(`pad-hit-${index}`));
      }
    } catch (error) {
      GameErrors.log(`SoundPad: checkHitAndFeedback error for pad ${index}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'w': checkHitAndFeedback(0); break;
        case 'o': checkHitAndFeedback(1); break;
        case 'i': checkHitAndFeedback(2); break;
        case 'e': checkHitAndFeedback(3); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPadHit]);

  return (
    <div className="p-6 glass-panel rounded-xl border border-neon-pink/30 relative bg-black/40">
      {/* Decorative wires */}
      <div className="absolute -top-4 left-10 w-1 h-10 bg-neon-purple/50" />
      <div className="absolute -top-4 right-10 w-1 h-10 bg-neon-purple/50" />

      {/* Grid Container - Smaller gap, no overlaps */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <PadButton 
              index={i} 
              onClick={() => checkHitAndFeedback(i)} 
              notes={notes.filter(n => n.lane === i)}
              currentTime={currentTime}
            />
            <div className="text-xs text-muted-foreground font-rajdhani font-bold tracking-wider">
              KEY: {['W', 'O', 'I', 'E'][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PadButton({ index, onClick, notes, currentTime }: { index: number; onClick: () => void; notes: Note[]; currentTime: number }) {
  
  const [isHitSuccess, setIsHitSuccess] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // Listen for the specific event for this pad
  useEffect(() => {
    const handler = () => {
      setIsHitSuccess(true);
      setTimeout(() => setIsHitSuccess(false), 200);
    };
    window.addEventListener(`pad-hit-${index}`, handler);
    return () => window.removeEventListener(`pad-hit-${index}`, handler);
  }, [index]);

  const padColor = PAD_COLORS[index];
  const padStyle = PAD_STYLES[index];

  const handleMouseDown = () => {
    setIsPressed(true);
    onClick();
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl group focus:outline-none"
      data-testid={`pad-${index}`}
      style={{ isolation: 'isolate' }}
      animate={{
        boxShadow: isHitSuccess 
          ? `0 0 40px ${padColor}` 
          : isPressed 
            ? `0 0 30px ${padColor}, inset 0 0 20px ${padColor}` 
            : '0 0 0px rgba(0,0,0,0)'
      }}
      transition={{ duration: 0.1 }}
    >
      {/* Pad Background */}
      <motion.div 
        className={`absolute inset-0 rounded-xl overflow-hidden border-2 ${padStyle.bg} ${padStyle.border} ${padStyle.shadow} group-hover:border-opacity-100 transition-all duration-200`}
        animate={isHitSuccess ? { boxShadow: `0 0 40px ${padColor}` } : {}}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20" />
      </motion.div>


      {/* Hit Flash - Success */}
      {isHitSuccess && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 rounded-xl z-40 bg-white"
          style={{ boxShadow: "0 0 40px 20px cyan" }}
        />
      )}

      {/* Standard Press Feedback */}
      <motion.div 
        className="absolute inset-0 bg-white/20 rounded-xl z-30"
        initial={{ opacity: 0 }}
        whileTap={{ opacity: 1 }}
      />
    </motion.button>
  );
}
