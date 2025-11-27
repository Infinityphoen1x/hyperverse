import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import wheelImg from "@assets/generated_images/neon_glowing_cyber_turntable_interface.png";
import { GameErrors } from "@/lib/gameEngine";

interface CamelotWheelProps {
  side: "left" | "right";
  onSpin: () => void;
  currentTime: number;
  holdStartTime?: number;
  onHoldStart?: (lane: number) => void;
  onHoldEnd?: () => void;
  onRotationChange?: (rotation: number) => void;
}


export function CamelotWheel({ side, onSpin, currentTime, holdStartTime = 0, onHoldStart = () => {}, onHoldEnd = () => {}, onRotationChange = () => {} }: CamelotWheelProps) {
  const [internalRotation, setInternalRotation] = useState(0);
  const [spinDirection, setSpinDirection] = useState(1); // 1 for clockwise, -1 for counter-clockwise
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const rotationRef = useRef(0);
  const wheelLane = side === 'left' ? -1 : -2;

  // Single key toggle for spin direction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      const isLeftDeckKey = side === 'left' && key === 'q';
      const isRightDeckKey = side === 'right' && key === 'p';
      
      if (isLeftDeckKey || isRightDeckKey) {
        setIsKeyPressed(true);
        setSpinDirection((prev) => prev * -1); // Toggle direction
        
        // Pass correct lane: -1 for left (Q), -2 for right (P)
        setTimeout(() => onHoldStart(wheelLane), 0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      const isLeftDeckKey = side === 'left' && key === 'q';
      const isRightDeckKey = side === 'right' && key === 'p';
      
      if (isLeftDeckKey || isRightDeckKey) {
        setIsKeyPressed(false);
        // Defer callback to next microtask
        setTimeout(() => onHoldEnd(), 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [side, onHoldStart, onHoldEnd]);

  // Continuous rotation loop using RAF
  useEffect(() => {
    let animationId: number;
    const rotationSpeed = 2.0; // degrees per frame (faster deck rotation)
    const spinThreshold = 30; // trigger onSpin every N degrees
    let lastSpinRotation = 0;

    const animate = () => {
      if (isKeyPressed) {
        setInternalRotation((prev) => {
          const rotationDelta = rotationSpeed * spinDirection;
          const newRotation = prev + rotationDelta;
          rotationRef.current = newRotation;
          setTimeout(() => onRotationChange(newRotation), 0); // Export to parent

          // Trigger onSpin event periodically based on rotation distance
          if (Math.abs(newRotation - lastSpinRotation) >= spinThreshold) {
            setTimeout(() => onSpin(), 0);
            lastSpinRotation = newRotation;
          }
          
          return newRotation;
        });
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isKeyPressed, spinDirection, onSpin]);


  const handleDrag = (_: any, info: any) => {
    try {
      if (!info || !info.delta || !Number.isFinite(info.delta.x)) {
        GameErrors.log(`CamelotWheel: Invalid drag info`);
        return;
      }
      
      setInternalRotation((prev) => {
        if (!Number.isFinite(prev)) {
          GameErrors.log(`CamelotWheel: Invalid rotation state ${prev}`);
          return prev;
        }
        const newRot = prev + info.delta.x;
        setTimeout(() => onRotationChange(newRot), 0);
        return newRot;
      });
      
      if (info.velocity && Math.abs(info.velocity.x) > 100) {
        onSpin();
      }
    } catch (error) {
      GameErrors.log(`CamelotWheel drag error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 relative">

      {/* Hitline at top edge */}
      <div className={`absolute z-40 -top-16 ${side === 'left' ? 'left-0' : 'right-0'}`}>
        <div 
          className={`w-1 h-16 ${side === 'left' ? 'bg-neon-green/70 shadow-[0_0_20px_rgb(0,255,0)]' : 'bg-neon-red/70 shadow-[0_0_20px_rgb(255,0,0)]'}`}
        />
      </div>

      {/* Semicircle Container */}
      <div className="relative h-64 w-32 md:h-80 md:w-40 overflow-hidden">

        {/* Inner Container for the Full Wheel - positioned to show only from spawn point (50%) onwards */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'right-0' : 'left-0'}`}
        >
          {/* The Interactive Wheel (Spins) */}
          <motion.div
            className={`w-full h-full rounded-full border-4 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing ${side === 'left' ? 'border-neon-green/50 shadow-[0_0_30px_rgba(0,255,0,0.3)]' : 'border-neon-red/50 shadow-[0_0_30px_rgba(255,0,0,0.3)]'}`}
            style={{ rotate: internalRotation }}
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
        </div>
      </div>
      
      {/* Top Hitline Indicator (at top of wheel) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-70 rounded-full blur-sm" />
      
      {/* Bottom Hitline Indicator (at bottom of wheel) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-70 rounded-full blur-sm" />
      
      {/* Label */}
      <div className="text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}
