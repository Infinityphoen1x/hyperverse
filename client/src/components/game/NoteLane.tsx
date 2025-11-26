import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";

interface NoteLaneProps {
  notes: Note[];
  currentTime: number;
  laneIndex: number;
}

export function NoteLane({ notes, currentTime, laneIndex }: NoteLaneProps) {
  // Filter notes for this lane
  const laneNotes = notes.filter(n => n.lane === laneIndex && !n.hit && !n.missed);

  return (
    <div className="relative h-[600px] w-20 md:w-24 bg-black/40 border-x border-white/5 overflow-hidden">
      {/* Lane Guide Line */}
      <div className="absolute inset-0 m-auto w-[1px] bg-white/10" />
      
      {/* Hit Line */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-neon-cyan/50 shadow-[0_0_10px_cyan]" />

      <AnimatePresence>
        {laneNotes.map((note) => {
          // Calculate position: 0% at top, 100% at bottom (0ms difference)
          // Let's say note spawns 2000ms before hit
          const timeUntilHit = note.time - currentTime;
          const progress = 1 - (timeUntilHit / 1500); // 1500ms travel time
          
          if (progress < -0.2 || progress > 1.2) return null;

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, top: `${progress * 100}%` }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute left-2 right-2 h-8 rounded-md z-10"
              style={{ 
                backgroundColor: laneIndex % 2 === 0 ? 'var(--color-neon-pink)' : 'var(--color-neon-blue)',
                boxShadow: `0 0 15px ${laneIndex % 2 === 0 ? 'var(--color-neon-pink)' : 'var(--color-neon-blue)'}`
              }}
            >
              <div className="absolute inset-0 bg-white/30 mix-blend-overlay" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
