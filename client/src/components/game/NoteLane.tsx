import { motion, AnimatePresence } from "framer-motion";
import { Note } from "@/lib/gameEngine";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NoteLaneProps {
  notes: Note[];
  currentTime: number;
}

export function NoteLane({ notes, currentTime }: NoteLaneProps) {
  // Separate soundpad notes (lanes 0-3) and deck notes (lanes -1, -2)
  const soundpadNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    return (n.lane >= 0 && n.lane <= 3) && timeUntilHit > -200 && timeUntilHit < 2000;
  });

  const deckNotes = notes.filter(n => {
    const timeUntilHit = n.time - currentTime;
    return (n.lane === -1 || n.lane === -2) && timeUntilHit > -200 && timeUntilHit < 2000;
  });

  const getColorClass = (lane: number): string => {
    switch (lane) {
      case -1: return 'bg-neon-green shadow-[0_0_15px_rgb(0,255,0)]';
      case -2: return 'bg-neon-red shadow-[0_0_15px_rgb(255,0,0)]';
      case 0: return 'bg-neon-pink shadow-[0_0_15px_rgb(255,0,127)]';
      case 1: return 'bg-neon-cyan shadow-[0_0_15px_rgb(0,255,255)]';
      case 2: return 'bg-neon-purple shadow-[0_0_15px_rgb(190,0,255)]';
      case 3: return 'bg-neon-blue shadow-[0_0_15px_rgb(0,150,255)]';
      default: return 'bg-gray-500';
    }
  };

  const getNoteKey = (lane: number): string => {
    if (lane === -1) return 'Q';
    if (lane === -2) return 'P';
    return ['W', 'E', 'I', 'O'][lane];
  };

  return (
    <div className="relative mx-auto space-y-6" style={{ width: '1000px', maxWidth: '100%' }}>
      {/* Soundpad Lane */}
      <div>
        <div className="text-xs text-white/40 mb-2 px-2 font-rajdhani tracking-wider">PAD NOTES</div>
        <div className="relative h-16 bg-black/40 border-2 border-white/10 rounded-lg overflow-hidden backdrop-blur-sm" style={{ width: '100%' }}>
          
          {/* Hitline indicator at right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-neon-cyan/70 shadow-[0_0_20px_cyan] z-20" />
          
          {/* Soundpad Notes flowing in from left */}
          <AnimatePresence>
            {soundpadNotes.map(note => {
              const timeUntilHit = note.time - currentTime;
              const progress = 1 - (timeUntilHit / 2000);
              const xPosition = progress * 100;

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className={`absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-lg ${getColorClass(note.lane)} flex items-center justify-center text-black font-bold text-sm font-rajdhani z-10`}
                  style={{ left: `${xPosition}%`, transform: 'translate(-50%, -50%)' }}
                >
                  {getNoteKey(note.lane)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Deck Notes Lane - Hold & Release */}
      <div>
        <div className="text-xs text-white/40 mb-2 px-2 font-rajdhani tracking-wider">DECK NOTES (HOLD & RELEASE)</div>
        <div className="relative h-16 bg-black/40 border-2 border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
          
          {/* Hitline indicator at right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-neon-cyan/70 shadow-[0_0_20px_cyan] z-20" />
          
          {/* Deck Notes flowing in as hold bars */}
          <AnimatePresence>
            {deckNotes.map(note => {
              const timeUntilHit = note.time - currentTime;
              const progress = 1 - (timeUntilHit / 2000);
              const xPosition = progress * 100;
              const holdDuration = 0.5; // 500ms hold duration visualization
              const holdWidth = holdDuration * 50; // width in % of lane

              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute top-1/2 -translate-y-1/2 h-full rounded-lg ${getColorClass(note.lane)} flex items-center justify-center text-black font-bold text-sm font-rajdhani z-10`}
                  style={{ 
                    left: `${xPosition}%`, 
                    transform: 'translateX(-50%)',
                    width: `${holdWidth}%`
                  }}
                >
                  <span className="text-xs">{getNoteKey(note.lane)} HOLD</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Deck Controls Indicator Below */}
      <div className="flex justify-between gap-8 mt-4 px-4">
        {/* Deck A (Left) Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ x: -4 }} className="cursor-pointer">
              <ChevronLeft className="w-5 h-5" style={{ color: 'hsl(120, 100%, 50%)' }} strokeWidth={3} />
            </motion.div>
            <span className="font-rajdhani font-bold text-sm" style={{ color: 'hsl(120, 100%, 50%)' }}>Q</span>
          </div>
          <span className="text-xs tracking-wider font-rajdhani" style={{ color: 'hsl(120, 100%, 50%, 0.6)' }}>DECK A</span>
          <div className="flex items-center gap-1">
            <span className="font-rajdhani font-bold text-sm" style={{ color: 'hsl(120, 100%, 50%)' }}>W</span>
            <motion.div whileHover={{ x: 4 }} className="cursor-pointer">
              <ChevronRight className="w-5 h-5" style={{ color: 'hsl(120, 100%, 50%)' }} strokeWidth={3} />
            </motion.div>
          </div>
        </div>

        {/* Deck B (Right) Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ x: -4 }} className="cursor-pointer">
              <ChevronLeft className="w-5 h-5" style={{ color: 'hsl(0, 100%, 50%)' }} strokeWidth={3} />
            </motion.div>
            <span className="font-rajdhani font-bold text-sm" style={{ color: 'hsl(0, 100%, 50%)' }}>O</span>
          </div>
          <span className="text-xs tracking-wider font-rajdhani" style={{ color: 'hsl(0, 100%, 50%, 0.6)' }}>DECK B</span>
          <div className="flex items-center gap-1">
            <span className="font-rajdhani font-bold text-sm" style={{ color: 'hsl(0, 100%, 50%)' }}>P</span>
            <motion.div whileHover={{ x: 4 }} className="cursor-pointer">
              <ChevronRight className="w-5 h-5" style={{ color: 'hsl(0, 100%, 50%)' }} strokeWidth={3} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
