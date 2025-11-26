import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import wheelImg from "@assets/generated_images/neon_glowing_cyber_turntable_interface.png";
import { Note } from "@/lib/gameEngine";

interface CamelotWheelProps {
  side: "left" | "right";
  onSpin: () => void;
  notes: Note[];
  currentTime: number;
}

export function CamelotWheel({ side, onSpin, notes, currentTime }: CamelotWheelProps) {
  const [rotation, setRotation] = useState(0);

  // Filter relevant notes
  const wheelLane = side === 'left' ? -1 : -2;
  const activeNotes = notes.filter(n => n.lane === wheelLane && !n.hit && !n.missed);

  const handleDrag = (_: any, info: any) => {
    setRotation((prev) => prev + info.delta.x);
    if (Math.abs(info.velocity.x) > 100) {
      onSpin();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 relative">
      
      {/* Semicircle Container */}
      <div className="relative h-64 w-32 md:h-80 md:w-40 overflow-hidden">
        
        {/* Inner Container for the Full Wheel - Show Left Half for Left Deck, Right Half for Right Deck */}
        <div 
          className={`absolute top-0 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'left-0' : 'right-0'}`}
        >
          {/* The Interactive Wheel (Spins) */}
          <motion.div
            className="w-full h-full rounded-full border-4 border-neon-purple/50 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing shadow-[0_0_30px_rgba(190,0,255,0.3)]"
            style={{ rotate: rotation }}
            drag="x"
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0}
            onDrag={handleDrag}
          >
             <img 
               src={wheelImg} 
               alt="Turntable" 
               className="w-full h-full object-cover opacity-80 mix-blend-screen"
               draggable={false}
             />
             
             {/* Center Axis */}
             <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black border-2 border-neon-cyan flex items-center justify-center z-20">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
             </div>
          </motion.div>

          {/* Note Layer (Sits on top, non-spinning container) */}
          <div className="absolute inset-0 pointer-events-none rounded-full">
             <AnimatePresence>
               {activeNotes.map(note => {
                 const timeUntilHit = note.time - currentTime;
                 if (timeUntilHit > 2000 || timeUntilHit < -200) return null;
                 
                 // Progress: 0 = at center, 1 = at rim
                 const progress = 1 - (timeUntilHit / 2000);
                 const visualProgress = Math.max(0, progress);
                 
                 // Movement Logic: dots travel radially from center to outer rim
                 // Left Deck: Center (50%) -> Left Rim (0%)
                 // Right Deck: Center (50%) -> Right Rim (100%)
                 
                 const baseLeft = side === 'left' ? 0 : 100; // Target rim position
                 const currentLeft = 50 + (baseLeft - 50) * visualProgress; // Interpolate from 50% to target
                 
                 const scale = 0.5 + (visualProgress * 0.5);
                 const opacity = visualProgress > 0 ? Math.min(1, visualProgress * 1.5) : 0;

                 return (
                   <motion.div
                     key={note.id}
                     className="absolute top-1/2 -translate-y-1/2 z-20"
                     animate={{
                       left: `${currentLeft}%`,
                       scale,
                       opacity
                     }}
                     transition={{ duration: 0.016 }} // ~60fps updates
                     initial={{ opacity: 0, left: '50%', scale: 0.5 }}
                   >
                     <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-neon-pink shadow-[0_0_15px_magenta] border-2 border-white" />
                   </motion.div>
                 );
               })}
             </AnimatePresence>
          </div>
        </div>
        
        {/* Judgement Line (Inner edge - the y-axis split between decks) */}
        {/* 
            Left Deck: Judgement on Right Edge (inner)
            Right Deck: Judgement on Left Edge (inner)
        */}
        <div className={`absolute top-0 bottom-0 w-1 bg-neon-cyan/50 z-30 ${side === 'left' ? 'right-0' : 'left-0'} shadow-[0_0_10px_cyan]`} />
        
        {/* Judgement Marker Arrow */}
        <div className={`absolute top-1/2 -translate-y-1/2 z-30 flex items-center ${side === 'left' ? 'right-0 -mr-3 flex-row-reverse' : 'left-0 -ml-3'}`}>
             <div className={`w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ${side === 'left' ? 'border-l-[10px] border-l-neon-cyan' : 'border-r-[10px] border-r-neon-cyan'}`} />
        </div>

      </div>
      
      {/* Label */}
      <div className="text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
