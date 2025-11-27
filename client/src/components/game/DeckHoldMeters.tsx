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
  // Track when holds end (hitline detection) to briefly freeze meter for visual feedback
  const [holdEndProgress, setHoldEndProgress] = useState<Record<number, number>>({ '-1': 0, '-2': 0 });
  const [holdEndTime, setHoldEndTime] = useState<Record<number, number>>({ '-1': 0, '-2': 0 });
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
        setHoldEndTime(prev => ({ ...prev, [lane]: currentTime })); // Mark when it ended
      }
      
      // New hold started, clear the end progress
      if (prevTime === 0 && currTime > 0) {
        setHoldEndProgress(prev => ({ ...prev, [lane]: 0 }));
        setHoldEndTime(prev => ({ ...prev, [lane]: 0 }));
      }
    });
    
    prevHoldStartTimes.current = { ...holdStartTimes };
  }, [holdStartTimes, currentTime]);

  // Get hold progress based on holdStartTimes passed from parent
  // Only charges when actively holding with an active hold note AND dot is present
  const getHoldProgress = (lane: number): number => {
    try {
      if (!Number.isInteger(lane)) return 0;
      
      const holdStartTime = holdStartTimes[lane] || 0;
      
      // Validate time values
      if (!Number.isFinite(holdStartTime) || !Number.isFinite(currentTime)) {
        return 0;
      }
      
      // Find active hold note on this lane
      const activeNote = Array.isArray(notes) ? notes.find(n => 
        n &&
        n.lane === lane && 
        (n.type === 'SPIN_LEFT' || n.type === 'SPIN_RIGHT') && 
        !n.hit && 
        !n.missed
      ) : null;
      
      // Only show frozen progress briefly (300ms) after hold ends
      const holdEndTimeVal = holdEndTime[lane] || 0;
      if (holdEndTimeVal > 0 && currentTime - holdEndTimeVal < 300) {
        return Math.min(Math.max(holdEndProgress[lane], 0), 1);
      }
      
      // If no active hold note, return 0 (no charge without active note)
      if (!activeNote) {
        return 0;
      }
      
      // Check if dot actually exists: spawns at note.time and hits hitline at note.time + 2000
      const DOT_SPAWN_TIME = activeNote.time;
      const DOT_HITLINE_TIME = activeNote.time + 2000;
      
      // Dot hasn't spawned yet or already passed hitline = no dot present
      if (currentTime < DOT_SPAWN_TIME || currentTime > DOT_HITLINE_TIME) {
        return 0; // No dot to hold
      }
      
      // Not actively holding
      if (holdStartTime === 0) return 0;
      
      // Currently holding an active note with dot present - show real-time progress
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
