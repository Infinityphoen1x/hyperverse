import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Note, GameErrors } from "@/lib/gameEngine";
import { ACTIVATION_WINDOW, HIT_SUCCESS_DURATION, SOUNDPAD_COLORS, SOUNDPAD_STYLES } from "@/lib/gameConstants";

interface SoundPadProps {
  onPadHit: (index: number) => void;
  notes: Note[];
  currentTime: number;
}

export function SoundPad({ onPadHit, notes, currentTime }: SoundPadProps) {
  const [hitFeedback, setHitFeedback] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false });
  
  // Validate pad index with bounds checking
  const isValidPadIndex = (index: number): boolean => {
    return Number.isFinite(index) && index >= 0 && index <= 3;
  };

  // Hit detection and feedback trigger - pass callback directly instead of window events
  const checkHitAndTriggerFeedback = useCallback((index: number) => {
    try {
      if (!isValidPadIndex(index)) {
        GameErrors.log(`SoundPad: Invalid pad index ${index}`);
        return;
      }
      
      // Trigger game engine hit
      onPadHit(index);
      
      // Check for hittable note in this lane within activation window
      if (!Array.isArray(notes)) {
        GameErrors.log(`SoundPad: Notes is not an array`);
        return;
      }
      
      // Find hittable note on this lane (don't filter twice - check directly)
      const hasHittableNote = notes.some(n => 
        n && 
        Number.isFinite(n.lane) && n.lane === index &&
        !n.hit && !n.missed && !n.tapMissFailure && 
        Number.isFinite(n.time) && 
        Math.abs(n.time - currentTime) < ACTIVATION_WINDOW
      );
      
      // Trigger visual feedback if hit is valid
      if (hasHittableNote) {
        setHitFeedback(prev => ({ ...prev, [index]: true }));
      }
    } catch (error) {
      GameErrors.log(`SoundPad: checkHitAndTriggerFeedback error for pad ${index}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [onPadHit, notes, currentTime]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'w': checkHitAndTriggerFeedback(0); break;
        case 'o': checkHitAndTriggerFeedback(1); break;
        case 'i': checkHitAndTriggerFeedback(2); break;
        case 'e': checkHitAndTriggerFeedback(3); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkHitAndTriggerFeedback]);

  // Clear hit feedback after duration
  useEffect(() => {
    const activeHits = Object.entries(hitFeedback).filter(([_, isActive]) => isActive);
    if (activeHits.length === 0) return;
    
    const timer = setTimeout(() => {
      setHitFeedback(prev => {
        const updated = { ...prev };
        activeHits.forEach(([index]) => {
          updated[parseInt(index)] = false;
        });
        return updated;
      });
    }, HIT_SUCCESS_DURATION);
    
    return () => clearTimeout(timer);
  }, [hitFeedback]);

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
              onClick={() => checkHitAndTriggerFeedback(i)} 
              isHitSuccess={hitFeedback[i]}
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

function PadButton({ index, onClick, isHitSuccess }: { index: number; onClick: () => void; isHitSuccess: boolean }) {
  const [isPressed, setIsPressed] = useState(false);
  
  const padColor = SOUNDPAD_COLORS[index];
  const padStyle = SOUNDPAD_STYLES[index];

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
