import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Note } from "@/lib/gameEngine";

interface DeckHoldMetersProps {
  notes: Note[];
  currentTime: number;
  holdStartTimes: Record<number, number>;
  onHoldStart: (lane: number) => void;
  onHoldEnd: (lane: number) => void;
}

export function DeckHoldMeters({ notes, currentTime, holdStartTimes, onHoldStart, onHoldEnd }: DeckHoldMetersProps) {
  const [localHoldStart, setLocalHoldStart] = useState<Record<number, number>>({ '-1': 0, '-2': 0 });

  // Listen for Q and P key presses directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      if (key === 'q') {
        setLocalHoldStart(prev => ({ ...prev, '-1': currentTime }));
        onHoldStart(-1);
      } else if (key === 'p') {
        setLocalHoldStart(prev => ({ ...prev, '-2': currentTime }));
        onHoldStart(-2);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (key === 'q') {
        setLocalHoldStart(prev => ({ ...prev, '-1': 0 }));
        onHoldEnd(-1);
      } else if (key === 'p') {
        setLocalHoldStart(prev => ({ ...prev, '-2': 0 }));
        onHoldEnd(-2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentTime, onHoldStart, onHoldEnd]);

  // Get hold progress based on actual key press time
  const getHoldProgress = (lane: number): number => {
    const laneKey = String(lane);
    const holdStartTime = localHoldStart[laneKey];
    if (!holdStartTime || holdStartTime === 0) return 0; // No active hold
    
    const actualHoldDuration = currentTime - holdStartTime;
    const maxHoldDuration = 2000;
    
    return Math.min(Math.max(actualHoldDuration / maxHoldDuration, 0), 1);
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
