import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NoteLaneProps {
  notes: Note[];
  currentTime: number;
}

export function NoteLane({ notes, currentTime }: NoteLaneProps) {
  // Get visible notes (soundpad notes only, lanes 0-3)
  const visibleNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    return n.lane >= 0 && n.lane <= 3 && timeUntilHit > -200 && timeUntilHit < 2000;
  });

  const getColorClass = (lane: number): string => {
    switch (lane) {
      case 0: return 'bg-neon-pink shadow-[0_0_15px_rgb(255,0,127)]';
      case 1: return 'bg-neon-cyan shadow-[0_0_15px_rgb(0,255,255)]';
      case 2: return 'bg-neon-purple shadow-[0_0_15px_rgb(190,0,255)]';
      case 3: return 'bg-neon-blue shadow-[0_0_15px_rgb(0,150,255)]';
      default: return 'bg-gray-500';
    }
  };

  const getNoteKey = (lane: number): string => {
    return ['3', '4', '8', '9'][lane];
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Notelane Background */}
      <div className="relative h-20 bg-black/40 border-2 border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
        
        {/* Hitline indicator at right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-neon-cyan/70 shadow-[0_0_20px_cyan] z-20" />
        
        {/* Notes flowing in from left */}
        <AnimatePresence>
          {visibleNotes.map(note => {
            const timeUntilHit = note.time - currentTime;
            const progress = 1 - (timeUntilHit / 2000);
            const xPosition = progress * 100;

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className={`absolute top-1/2 -translate-y-1/2 w-14 h-14 rounded-lg ${getColorClass(note.lane)} flex items-center justify-center text-black font-bold text-base font-rajdhani z-10`}
                style={{ left: `${xPosition}%`, transform: 'translate(-50%, -50%)' }}
              >
                {getNoteKey(note.lane)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Deck Controls Indicator Below */}
      <div className="flex justify-between gap-8 mt-4 px-4">
        {/* Deck A (Left) Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ x: -4 }} className="cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-neon-pink" strokeWidth={3} />
            </motion.div>
            <span className="text-neon-pink font-rajdhani font-bold text-sm">Q</span>
          </div>
          <span className="text-white/40 text-xs tracking-wider">DECK A</span>
          <div className="flex items-center gap-1">
            <span className="text-neon-pink font-rajdhani font-bold text-sm">W</span>
            <motion.div whileHover={{ x: 4 }} className="cursor-pointer">
              <ChevronRight className="w-5 h-5 text-neon-pink" strokeWidth={3} />
            </motion.div>
          </div>
        </div>

        {/* Deck B (Right) Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ x: -4 }} className="cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-neon-purple" strokeWidth={3} />
            </motion.div>
            <span className="text-neon-purple font-rajdhani font-bold text-sm">O</span>
          </div>
          <span className="text-white/40 text-xs tracking-wider">DECK B</span>
          <div className="flex items-center gap-1">
            <span className="text-neon-purple font-rajdhani font-bold text-sm">P</span>
            <motion.div whileHover={{ x: 4 }} className="cursor-pointer">
              <ChevronRight className="w-5 h-5 text-neon-purple" strokeWidth={3} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
