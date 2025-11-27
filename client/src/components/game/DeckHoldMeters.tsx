import { motion } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface DeckHoldMetersProps {
  notes: Note[];
  currentTime: number;
}

export function DeckHoldMeters({ notes, currentTime }: DeckHoldMetersProps) {
  // Find active hold notes for each deck
  const getHoldProgress = (lane: number): number => {
    const activeNote = notes.find(n => 
      !n.missed && 
      n.lane === lane && 
      n.time <= currentTime && 
      currentTime < n.time + 2000 // Assume 2s hold duration
    );
    
    if (!activeNote) return 0;
    
    const progress = (currentTime - activeNote.time) / 2000;
    return Math.min(Math.max(progress, 0), 1);
  };

  const leftProgress = getHoldProgress(-1);
  const rightProgress = getHoldProgress(-2);

  const SegmentedMeter = ({ progress, color, side }: { progress: number; color: string; side: 'left' | 'right' }) => {
    const segments = 8;
    const filledSegments = Math.ceil(progress * segments);

    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: segments }).map((_, idx) => (
          <motion.div
            key={idx}
            className="w-6 h-4 rounded border-2"
            style={{
              borderColor: color,
              background: idx < filledSegments ? color : 'transparent',
              boxShadow: idx < filledSegments ? `0 0 12px ${color}` : 'none',
            }}
            animate={{
              opacity: idx < filledSegments ? 1 : 0.2,
            }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      {/* Left Deck Hold Meter */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs font-rajdhani text-neon-green font-bold tracking-widest">Q</div>
        <SegmentedMeter progress={leftProgress} color="#00FF00" side="left" />
      </div>

      {/* Right Deck Hold Meter */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs font-rajdhani text-neon-red font-bold tracking-widest">P</div>
        <SegmentedMeter progress={rightProgress} color="#FF0000" side="right" />
      </div>
    </div>
  );
}
