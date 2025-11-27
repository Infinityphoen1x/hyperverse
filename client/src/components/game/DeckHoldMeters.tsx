import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Note } from "@/lib/gameEngine";

interface DeckHoldMetersProps {
  notes: Note[];
  currentTime: number;
  holdStartTimes: Record<number, number>;
  onHoldStart: (lane: number) => void;
  onHoldEnd: (lane: number) => void;
}

export function DeckHoldMeters({ notes, currentTime, holdStartTimes, onHoldStart, onHoldEnd }: DeckHoldMetersProps) {
  // Track when holds end (hitline detection) to freeze meter at final progress
  const [holdEndProgress, setHoldEndProgress] = useState<Record<number, number>>({ '-1': 0, '-2': 0 });
  const prevHoldStartTimes = useRef<Record<number, number>>({ '-1': 0, '-2': 0 });

  // Detect when hold ends (holdStartTime goes from non-zero to 0)
  useEffect(() => {
    [-1, -2].forEach((lane) => {
      const prevTime = prevHoldStartTimes.current[lane] || 0;
      const currTime = holdStartTimes[lane] || 0;
      
      // Hold just ended (was holding, now not holding)
      if (prevTime > 0 && currTime === 0) {
        const holdDuration = currentTime - prevTime;
        const finalProgress = Math.min(holdDuration / 4000, 1.0);
        setHoldEndProgress(prev => ({ ...prev, [lane]: finalProgress }));
      }
      
      // New hold started, clear the end progress
      if (prevTime === 0 && currTime > 0) {
        setHoldEndProgress(prev => ({ ...prev, [lane]: 0 }));
      }
    });
    
    prevHoldStartTimes.current = { ...holdStartTimes };
  }, [holdStartTimes, currentTime]);

  // Get hold progress based on holdStartTimes passed from parent
  // Only charges when there's an active hold note for that lane
  const getHoldProgress = (lane: number): number => {
    try {
      if (!Number.isInteger(lane)) return 0;
      
      const holdStartTime = holdStartTimes[lane] || 0;
      
      // Validate time values
      if (!Number.isFinite(holdStartTime) || !Number.isFinite(currentTime)) {
        return 0;
      }
      
      // Check if there's an active hold note for this lane
      const hasActiveHoldNote = Array.isArray(notes) && notes.some(n => 
        n &&
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.hit && 
        !n.missed
      );
      
      // If no active hold note, don't charge
      if (!hasActiveHoldNote) {
        // But return frozen progress if hold just ended
        if (holdEndProgress[lane] > 0) {
          return Math.min(Math.max(holdEndProgress[lane], 0), 1);
        }
        return 0;
      }
      
      // If hold just ended, return the frozen final progress
      if (holdStartTime === 0 && holdEndProgress[lane] > 0) {
        return Math.min(Math.max(holdEndProgress[lane], 0), 1);
      }
      
      // Not holding
      if (holdStartTime === 0) return 0;
      
      // Currently holding an active note - show real-time progress
      const actualHoldDuration = currentTime - holdStartTime;
      if (actualHoldDuration < 0 || !Number.isFinite(actualHoldDuration)) {
        return 0; // Negative duration = clock issue
      }
      
      const maxHoldDuration = 4000;
      const progress = actualHoldDuration / maxHoldDuration;
      
      // Clamp to valid range
      return Math.min(Math.max(progress, 0), 1);
    } catch (error) {
      console.warn(`getHoldProgress error: ${error}`);
      return 0;
    }
  };

  const leftProgress = getHoldProgress(-1);
  const rightProgress = getHoldProgress(-2);

  const getRectangleMeterColor = (index: number): string => {
    // Soundpad color palette
    const colors = ['#FF007F', '#00FFFF', '#BE00FF', '#0096FF']; // W, E, I, O colors
    return colors[index % 4];
  };

  const RectangleMeter = ({ progress, outlineColor }: { progress: number; outlineColor: string }) => {
    const segments = 16;
    const filledSegments = Math.ceil(progress * segments);

    return (
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: segments }).map((_, idx) => {
          const fillColor = getRectangleMeterColor(idx);
          return (
            <motion.div
              key={idx}
              className="h-4 rounded-sm border-2"
              style={{
                width: '60px',
                borderColor: outlineColor,
                background: idx < filledSegments ? fillColor : 'transparent',
                boxShadow: idx < filledSegments ? `0 0 10px ${fillColor}, inset 0 0 6px rgba(255,255,255,0.3)` : 'none',
              }}
              animate={{
                opacity: idx < filledSegments ? 1 : 0.15,
              }}
              transition={{ duration: 0.08 }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-green font-bold tracking-widest">Q</div>
        <RectangleMeter progress={leftProgress} outlineColor="#00FF00" />
      </div>

      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-rajdhani text-neon-red font-bold tracking-widest">P</div>
        <RectangleMeter progress={rightProgress} outlineColor="#FF0000" />
      </div>
    </div>
  );
}
