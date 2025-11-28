import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { GameErrors } from "@/lib/gameEngine";
import { BUTTON_CONFIG, VANISHING_POINT_X, VANISHING_POINT_Y, JUDGEMENT_RADIUS } from "@/lib/gameConstants";

interface SoundPadButtonsProps {
  onPadHit: (lane: number) => void;
}

export function SoundPadButtons({ onPadHit }: SoundPadButtonsProps) {
  const [pressedLanes, setPressedLanes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      
      const config = BUTTON_CONFIG.find(c => c.key.toLowerCase() === key);
      if (config) {
        setPressedLanes(prev => new Set(prev).add(config.lane));
        onPadHit(config.lane);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const config = BUTTON_CONFIG.find(c => c.key.toLowerCase() === key);
      if (config) {
        setPressedLanes(prev => {
          const next = new Set(prev);
          next.delete(config.lane);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPadHit]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {BUTTON_CONFIG.map(({ lane, key, angle, color }) => {
        const rad = (angle * Math.PI) / 180;
        const xPosition = VANISHING_POINT_X + Math.cos(rad) * JUDGEMENT_RADIUS;
        const yPosition = VANISHING_POINT_Y + Math.sin(rad) * JUDGEMENT_RADIUS;
        const isPressed = pressedLanes.has(lane);

        return (
          <motion.button
            key={`pad-${lane}`}
            className="absolute w-14 h-14 rounded-lg font-bold font-rajdhani text-white text-sm focus:outline-none pointer-events-auto transition-all duration-150"
            style={{
              left: `${xPosition}px`,
              top: `${yPosition}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: isPressed ? color : `${color}40`,
              border: `2px solid ${color}`,
              boxShadow: isPressed 
                ? `0 0 30px ${color}, 0 0 60px ${color}, inset 0 0 15px ${color}`
                : `0 0 15px ${color}80`,
            }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={() => {
              setPressedLanes(prev => new Set(prev).add(lane));
              onPadHit(lane);
            }}
            onMouseUp={() => {
              setPressedLanes(prev => {
                const next = new Set(prev);
                next.delete(lane);
                return next;
              });
            }}
            onMouseLeave={() => {
              setPressedLanes(prev => {
                const next = new Set(prev);
                next.delete(lane);
                return next;
              });
            }}
            data-testid={`pad-button-${lane}`}
          >
            {key}
          </motion.button>
        );
      })}
    </div>
  );
}
