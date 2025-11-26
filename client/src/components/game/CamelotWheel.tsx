import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import wheelImg from "@assets/generated_images/neon_glowing_cyber_turntable_interface.png";

interface CamelotWheelProps {
  side: "left" | "right";
  onSpin: () => void;
  active?: boolean;
}

export function CamelotWheel({ side, onSpin, active }: CamelotWheelProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (active) {
      // Auto spin visual effect when active/needed
      const interval = setInterval(() => {
        setRotation((prev) => prev + 2);
      }, 16);
      return () => clearInterval(interval);
    }
  }, [active]);

  const handleDrag = (_: any, info: any) => {
    setRotation((prev) => prev + info.delta.x);
    if (Math.abs(info.velocity.x) > 100) {
      onSpin();
    }
  };

  return (
    <div className={`relative w-48 h-48 md:w-64 md:h-64 ${side === 'left' ? '-rotate-12' : 'rotate-12'}`}>
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-full bg-neon-blue blur-xl opacity-20 animate-pulse" />
      
      <motion.div
        className="w-full h-full rounded-full border-4 border-neon-purple/50 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing shadow-[0_0_30px_rgba(190,0,255,0.3)]"
        style={{ rotate: rotation }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
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
         <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black border-2 border-neon-cyan flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
         </div>
      </motion.div>
      
      {/* Label */}
      <div className="absolute -bottom-8 left-0 right-0 text-center text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
