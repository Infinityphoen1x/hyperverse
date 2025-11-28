import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Note, GameErrors } from "@/lib/gameEngine";

const COMPLETION_THRESHOLD = 0.95;

interface DeckHoldMetersProps {
  notes: Note[];
  currentTime: number;
}

const getRectangleMeterColor = (lane: number): string => {
  if (lane === -1) return '#00FF00'; // Q - green
  if (lane === -2) return '#FF0000'; // P - red
  return '#FFFFFF'; // Fallback
};

interface RectangleMeterProps {
  progress: number;
  outlineColor: string;
  lane: number;
  completionGlow: Record<number, boolean>;
}

const RectangleMeter = ({ progress, outlineColor, lane, completionGlow }: RectangleMeterProps) => {
  const segments = 16;
  
  // Validate progress before rendering
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    GameErrors.log(`DeckMeter: Invalid progress=${progress} for lane ${lane}`);
    return null;
  }
  
  const filledSegments = Math.ceil(progress * segments);
  const isFull = progress >= COMPLETION_THRESHOLD;
  
  // Validate segment count
  if (!Number.isFinite(filledSegments) || filledSegments < 0 || filledSegments > segments) {
    GameErrors.log(`DeckMeter: Invalid filledSegments=${filledSegments} for lane ${lane} (max=${segments})`);
    return null;
  }

  return (
    <motion.div 
      className="flex flex-col-reverse gap-0.5"
      animate={completionGlow[lane] ? { scale: 1.15 } : { scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {Array.from({ length: segments }).map((_, idx) => {
        const fillColor = getRectangleMeterColor(lane);
        const isFilled = idx < filledSegments;
        
        // Full meter gets special glow treatment
        const fullMeterGlow = isFull && isFilled;
        
        return (
          <motion.div
            key={idx}
            className="h-4 rounded-sm border-2"
            style={{
              width: '60px',
              borderColor: outlineColor,
              background: isFilled ? fillColor : 'transparent',
              boxShadow: fullMeterGlow
                ? `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`
                : isFilled 
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)` 
                  : 'none',
            }}
            animate={{
              opacity: isFilled ? 1 : 0.15,
              boxShadow: fullMeterGlow
                ? [
                    `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`,
                    `0 0 20px ${fillColor}, 0 0 40px ${fillColor}, inset 0 0 10px rgba(255,255,255,0.8)`,
                    `0 0 15px ${fillColor}, 0 0 30px ${fillColor}, inset 0 0 8px rgba(255,255,255,0.6)`,
                  ]
                : isFilled
                  ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)`
                  : 'none',
            }}
            transition={fullMeterGlow ? { duration: 0.6, repeat: Infinity } : { duration: 0.08 }}
          />
        );
      })}
    </motion.div>
  );
};

export function DeckHoldMeters({ notes, currentTime }: DeckHoldMetersProps) {
  const [completionGlow, setCompletionGlow] = useState<Record<number, boolean>>({ [-1]: false, [-2]: false });
  const prevCompletionRef = useRef<Record<number, boolean>>({ [-1]: false, [-2]: false });
  const prevActiveNoteIdRef = useRef<Record<number, string>>({ [-1]: '', [-2]: '' });

  // Detect when a hold note ends and reset meter
  useEffect(() => {
    [-1, -2].forEach((lane) => {
      // Find currently active note on this lane
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n &&
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure &&
        n.pressTime && 
        n.pressTime > 0
      ) : null;
      
      const currentNoteId = activeNote?.id || '';
      const prevNoteId = prevActiveNoteIdRef.current[lane];
      
      // Hold note changed or ended - reset glow
      if (prevNoteId && prevNoteId !== currentNoteId) {
        prevCompletionRef.current[lane] = false;
        setCompletionGlow(prev => ({ ...prev, [lane]: false }));
      }
      
      // Update tracking
      prevActiveNoteIdRef.current[lane] = currentNoteId;
    });
  }, [notes, currentTime]);

  // Simple meter logic: just calculate progress based on active hold note's beatmap duration
  const getHoldProgress = (lane: number): number => {
    try {
      if (!Number.isInteger(lane) || !Array.isArray(notes)) return 0;
      if (!Number.isFinite(currentTime)) return 0;
      
      // Find active hold note on this lane (pressTime set and not failed)
      const activeNote = notes.find(n => 
        n &&
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.tooEarlyFailure &&
        !n.holdMissFailure &&
        !n.holdReleaseFailure &&
        n.pressTime && 
        n.pressTime > 0
      );
      
      if (!activeNote || !activeNote.pressTime) return 0;
      
      // Calculate progress: elapsed time / beatmap hold duration
      const beatmapHoldDuration = activeNote.duration || 1000;
      const elapsedSincePress = currentTime - activeNote.pressTime;
      
      if (elapsedSincePress < 0 || !Number.isFinite(elapsedSincePress)) {
        return 0;
      }
      
      // Progress: 0 at start, 1.0 when beatmap duration is reached, stays at 1.0 after
      const progress = Math.min(elapsedSincePress / beatmapHoldDuration, 1.0);
      
      if (!Number.isFinite(progress) || progress < 0) {
        return 0;
      }
      
      // Trigger completion glow when meter just reaches full (95%+)
      if (progress >= COMPLETION_THRESHOLD && !prevCompletionRef.current[lane]) {
        prevCompletionRef.current[lane] = true;
        setCompletionGlow(prev => ({ ...prev, [lane]: true }));
        setTimeout(() => setCompletionGlow(prev => ({ ...prev, [lane]: false })), 400);
      } else if (progress < COMPLETION_THRESHOLD) {
        prevCompletionRef.current[lane] = false;
      }
      
      return progress;
    } catch (error) {
      GameErrors.log(`DeckMeter getHoldProgress error for lane ${lane}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return 0;
    }
  };

  const leftProgress = getHoldProgress(-1);
  const rightProgress = getHoldProgress(-2);

  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-green font-bold tracking-widest">Q</div>
        <RectangleMeter progress={leftProgress} outlineColor="#00FF00" lane={-1} completionGlow={completionGlow} />
      </div>

      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-red font-bold tracking-widest">P</div>
        <RectangleMeter progress={rightProgress} outlineColor="#FF0000" lane={-2} completionGlow={completionGlow} />
      </div>
    </div>
  );
}
