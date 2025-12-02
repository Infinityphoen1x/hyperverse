import { motion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import wheelImg from "@assets/generated_images/neon_glowing_cyber_turntable_interface.png";
import { GameErrors } from '@/lib/errors/errorLog';
import { ROTATION_SPEED, SPIN_THRESHOLD, STATE_UPDATE_INTERVAL, DRAG_VELOCITY_THRESHOLD } from '@/lib/config/gameConstants';
import { useGameStore } from '@/stores/useGameStore';

interface CamelotWheelProps {
  side: "left" | "right";
  onSpin: () => void;
  onHoldStart?: (lane: number) => void;
  onHoldEnd?: () => void;
  onRotationChange?: (rotation: number) => void;
}

export function CamelotWheel({ 
  side, 
  onSpin, 
  onHoldStart = () => {}, 
  onHoldEnd = () => {}, 
  onRotationChange = () => {} 
}: CamelotWheelProps) {
  const [internalRotation, setInternalRotation] = useState(0);
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const rotationRef = useRef(0);
  const isKeyPressedRef = useRef(false);
  const lastSpinRotationRef = useRef(0);
  const lastStateUpdateTimeRef = useRef(0);
  const wheelLane = side === 'left' ? -1 : -2;
  const incrementSpinPressCount = useGameStore(state => state.incrementSpinPressCount);

  // Sync refs when state changes
  useEffect(() => {
    isKeyPressedRef.current = isKeyPressed;
  }, [isKeyPressed]);

  // Memoized callbacks to prevent recreation in effects
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    const isLeftDeckKey = side === 'left' && key === 'q';
    const isRightDeckKey = side === 'right' && key === 'p';

    if (isLeftDeckKey || isRightDeckKey) {
      setIsKeyPressed(true);
      onHoldStart(wheelLane);
      // Track key press for spin alternation (every press toggles direction)
      incrementSpinPressCount(wheelLane);
    }
  }, [side, wheelLane, onHoldStart]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const isLeftDeckKey = side === 'left' && key === 'q';
    const isRightDeckKey = side === 'right' && key === 'p';

    if (isLeftDeckKey || isRightDeckKey) {
      setIsKeyPressed(false);
      onHoldEnd();
    }
  }, [side, onHoldEnd]);

  // Single key toggle for spin direction - stable listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Continuous rotation loop using RAF - batches callbacks
  useEffect(() => {
    let animationId: number;
    const animate = (now: number) => {
      if (isKeyPressedRef.current) {
        const rotationDelta = ROTATION_SPEED;
        const newRotation = rotationRef.current + rotationDelta;
        rotationRef.current = newRotation;

        // Trigger onSpin event periodically when rotation threshold exceeded
        if (Math.abs(newRotation - lastSpinRotationRef.current) >= SPIN_THRESHOLD) {
          onSpin();
          lastSpinRotationRef.current = newRotation;
        }

        // Batch state updates and callbacks: only when interval elapsed
        if (now - lastStateUpdateTimeRef.current >= STATE_UPDATE_INTERVAL) {
          setInternalRotation(newRotation);
          onRotationChange(newRotation);
          lastStateUpdateTimeRef.current = now;
        }
      }
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [onSpin, onRotationChange]);

  const handleDrag = useCallback((_: any, info: any) => {
    try {
      // Validate full framer-motion drag info structure
      if (!info || typeof info !== 'object' || !info.delta || !Number.isFinite(info.delta.x)) {
        GameErrors.log(`CamelotWheel: Invalid drag info structure`);
        return;
      }

      // Update ref first for RAF loop consistency, then batch state update
      const newRot = rotationRef.current + info.delta.x;
      rotationRef.current = newRot;
      setInternalRotation(newRot);
      onRotationChange(newRot);

      // Trigger spin event if drag velocity exceeds threshold
      if (info.velocity && typeof info.velocity === 'object' && Number.isFinite(info.velocity.x) &&
          Math.abs(info.velocity.x) > DRAG_VELOCITY_THRESHOLD) {
        onSpin();
      }
    } catch (error) {
      GameErrors.log(`CamelotWheel drag error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [onRotationChange, onSpin]);

  // Hitline color class
  const hitlineColorClass = side === 'left' ? 'bg-neon-green/70 shadow-[0_0_20px_rgb(0,255,0)]' : 'bg-neon-red/70 shadow-[0_0_20px_rgb(255,0,0)]';
  const borderColorClass = side === 'left' ? 'border-neon-green/50 shadow-[0_0_30px_rgba(0,255,0,0.3)]' : 'border-neon-red/50 shadow-[0_0_30px_rgba(255,0,0,0.3)]';

  return (
    <div className="flex flex-col items-center gap-6 relative">
      {/* Hitline at top edge - scales with wheel */}
      <div className={`absolute z-40 -top-8 md:-top-10 ${side === 'left' ? 'left-1/2 -translate-x-1/4' : 'right-1/2 translate-x-1/4'}`}>
        <div className={`w-1 h-8 md:h-10 ${hitlineColorClass}`} />
      </div>

      {/* Semicircle Container */}
      <div className="relative h-64 w-32 md:h-80 md:w-40 overflow-hidden">
        {/* Inner Container for the Full Wheel - positioned to show only from spawn point (50%) onwards */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 ${side === 'left' ? 'right-0' : 'left-0'}`}
        >
          {/* The Interactive Wheel (Spins) */}
          <motion.div
            className={`w-full h-full rounded-full border-4 overflow-hidden relative bg-black cursor-grab active:cursor-grabbing ${borderColorClass}`}
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
               onError={(e) => {
                 // Fallback to gradient if image fails to load
                 (e.target as HTMLImageElement).style.display = 'none';
               }}
             />
             {/* Fallback pattern if image doesn't load */}
             <div className="absolute inset-0 bg-gradient-conic from-neon-green via-neon-blue to-neon-red opacity-20" />

             {/* Center Axis */}
             <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black border-2 border-neon-cyan flex items-center justify-center z-20">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
             </div>
          </motion.div>
        </div>
      </div>

      {/* Label */}
      <div className="text-neon-blue font-orbitron text-sm tracking-widest">
        DECK {side === 'left' ? 'A' : 'B'}
      </div>
    </div>
  );
}