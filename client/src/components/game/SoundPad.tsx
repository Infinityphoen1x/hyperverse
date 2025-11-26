import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Note } from "@/lib/gameEngine";

interface SoundPadProps {
  onPadHit: (index: number) => void;
  notes: Note[];
  currentTime: number;
}

export function SoundPad({ onPadHit, notes, currentTime }: SoundPadProps) {
  
  // Shared Hit Logic for Feedback
  const checkHitAndFeedback = (index: number) => {
    onPadHit(index);
    
    // Check for visual feedback (simulated "good" hit)
    const laneNotes = notes.filter(n => n.lane === index);
    const hasHittableNote = laneNotes.some(n => !n.hit && !n.missed && Math.abs(n.time - currentTime) < 300);
    
    if (hasHittableNote) {
      window.dispatchEvent(new CustomEvent(`pad-hit-${index}`));
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'a': checkHitAndFeedback(0); break;
        case 's': checkHitAndFeedback(1); break;
        case 'k': checkHitAndFeedback(2); break;
        case 'l': checkHitAndFeedback(3); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPadHit, notes, currentTime]);

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
              KEY: {['A', 'S', 'K', 'L'][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PadButton({ index, onClick, notes, currentTime }: { index: number; onClick: () => void; notes: Note[]; currentTime: number }) {
  
  const activeNotes = notes.filter(n => !n.hit && !n.missed);
  const [isHitSuccess, setIsHitSuccess] = useState(false);

  // Listen for the specific event for this pad
  useEffect(() => {
    const handler = () => {
      setIsHitSuccess(true);
      setTimeout(() => setIsHitSuccess(false), 200);
    };
    window.addEventListener(`pad-hit-${index}`, handler);
    return () => window.removeEventListener(`pad-hit-${index}`, handler);
  }, [index]);

  return (
    <motion.button
      whileTap={{ scale: 0.90 }}
      onMouseDown={onClick}
      className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl group focus:outline-none"
      data-testid={`pad-${index}`}
      style={{ isolation: 'isolate' }}
    >
      {/* Pad Background */}
      <div className={`absolute inset-0 rounded-xl overflow-hidden border-2 
        ${index === 0 ? 'bg-neon-pink/30 border-neon-pink/50' : ''}
        ${index === 1 ? 'bg-neon-cyan/30 border-neon-cyan/50' : ''}
        ${index === 2 ? 'bg-neon-purple/30 border-neon-purple/50' : ''}
        ${index === 3 ? 'bg-neon-blue/30 border-neon-blue/50' : ''}
        shadow-[0_0_10px_rgba(255,0,100,0.1)] group-hover:shadow-[0_0_20px_rgba(255,0,100,0.4)] group-hover:border-opacity-100 transition-all duration-200`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20" />
      </div>

      {/* Judgement Rings Overlay */}
      <AnimatePresence>
        {activeNotes.map(note => {
          const timeUntilHit = note.time - currentTime;
          if (timeUntilHit > 1000 || timeUntilHit < -200) return null;
          
          const scale = 1 + (timeUntilHit / 1000);

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 2 }}
              animate={{ opacity: 1, scale: scale }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0 }}
              className="absolute inset-[-8px] border-2 border-neon-cyan rounded-xl pointer-events-none z-20 shadow-[0_0_10px_cyan]"
              style={{ scale }}
            />
          );
        })}
      </AnimatePresence>

      {/* Hit Flash - Success */}
      <AnimatePresence>
        {isHitSuccess && (
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl z-40 bg-white"
            style={{ boxShadow: "0 0 40px 20px cyan" }}
          />
        )}
      </AnimatePresence>

      {/* Standard Press Feedback */}
      <motion.div 
        className="absolute inset-0 bg-white/20 rounded-xl z-30"
        initial={{ opacity: 0 }}
        whileTap={{ opacity: 1 }}
      />
    </motion.button>
  );
}
