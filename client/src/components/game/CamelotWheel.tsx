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

  // Layout Configuration:
  // User wants judgement line on the "y-axis that splits the decks" (The Center Axis).
  // This means the judgement lines should be on the "Inner" sides of the decks.
  // Deck A (Left): Judgement on Right side. Shows Right Half (D shape).
  // Deck B (Right): Judgement on Left side. Shows Left Half (C shape).

  return (
    <div className="flex flex-col items-center gap-4 relative">
      
      {/* Semicircle Container */}
      <div className="relative h-64 w-32 md:h-80 md:w-40 overflow-hidden">
        
        {/* Inner Container for the Full Wheel */}
        {/* 
           If side='left' (Deck A), we want to show the Right Half.
           So we position the wheel such that the Left Half is cropped out (off to the left).
           left: -100% of width? No, left: -32px? 
           Container width is 128px (w-32). Wheel width is 256px (w-64).
           If we put left: -128px, the right half is visible.
        */}
        <div 
          className={`absolute top-0 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'right-0' : 'left-0'}`}
          style={{ 
            left: side === 'left' ? '-100%' : '0' 
          }}
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
                 
                 // Movement Logic:
                 // Deck A (Left): Shows Right Half. Center is at Left Edge (0%). Rim is at Right Edge (100%).
                 // Move 50% -> 100% relative to the full circle container?
                 // Full circle center is 50%. Right Rim is 100%.
                 // So Deck A dots move 50% -> 100%.

                 // Deck B (Right): Shows Left Half. Center is at Right Edge (100% of visible?).
                 // Full circle center is 50%. Left Rim is 0%.
                 // So Deck B dots move 50% -> 0%.
                 
                 let leftPos = '50%';
                 if (side === 'left') {
                   // Deck A: Center (50%) -> Right Rim (100%)
                   const pos = 50 + (visualProgress * 50);
                   leftPos = `${pos}%`;
                 } else {
                   // Deck B: Center (50%) -> Left Rim (0%)
                   const pos = 50 - (visualProgress * 50);
                   leftPos = `${pos}%`;
                 }
                 
                 const scale = 0.5 + (visualProgress * 0.5);
                 const opacity = Math.min(1, visualProgress * 2); 

                 return (
                   <motion.div
                     key={note.id}
                     className="absolute top-1/2 -translate-y-1/2 z-20"
                     style={{ 
                       left: leftPos,
                       x: '-50%',
                       scale,
                       opacity
                     }}
                     initial={{ opacity: 0 }}
                   >
                     <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-neon-pink shadow-[0_0_15px_magenta] border-2 border-white" />
                   </motion.div>
                 );
               })}
             </AnimatePresence>
          </div>
        </div>
        
        {/* Judgement Line (Overlay on the Container) */}
        {/* 
            Left Deck: Judgement on Right Edge
            Right Deck: Judgement on Left Edge
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
