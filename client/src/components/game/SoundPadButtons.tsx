import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { GameErrors } from "@/lib/gameEngine";
import { BUTTON_CONFIG, VANISHING_POINT_X, VANISHING_POINT_Y, JUDGEMENT_RADIUS } from "@/lib/gameConstants";

interface SoundPadButtonsProps {
  onPadHit: (lane: number) => void;
}

// Helper to safely find config with error handling
const findConfigByKey = (key: string): typeof BUTTON_CONFIG[0] | undefined => {
  try {
    const lowerKey = key.toLowerCase();
    return BUTTON_CONFIG.find(c => c.key.toLowerCase() === lowerKey);
  } catch (error) {
    GameErrors.log(`SoundPadButtons: Error finding config for key ${key}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return undefined;
  }
};

export function SoundPadButtons({ onPadHit }: SoundPadButtonsProps) {
  const [pressedLanes, setPressedLanes] = useState<Record<number, boolean>>({});

  // Helper to update pressed state efficiently
  const setPressedState = useCallback((lane: number, isPressed: boolean) => {
    setPressedLanes(prev => {
      if (prev[lane] === isPressed) return prev; // No change
      const updated = { ...prev };
      if (isPressed) {
        updated[lane] = true;
      } else {
        delete updated[lane];
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      try {
        const config = findConfigByKey(e.key);
        if (config) {
          setPressedState(config.lane, true);
          onPadHit(config.lane);
        }
      } catch (error) {
        GameErrors.log(`SoundPadButtons: keyDown error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      try {
        const config = findConfigByKey(e.key);
        if (config) {
          setPressedState(config.lane, false);
        }
      } catch (error) {
        GameErrors.log(`SoundPadButtons: keyUp error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPadHit, setPressedState]);

  // Convert hex color to rgba with opacity
  const hexToRgba = (hex: string, alpha: number): string => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    } catch (error) {
      GameErrors.log(`SoundPadButtons: Invalid color format ${hex}`);
      return 'rgba(255,255,255,0.25)'; // Fallback to white semi-transparent
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {BUTTON_CONFIG.map(({ lane, key, angle, color }) => {
        const rad = (angle * Math.PI) / 180;
        const xPosition = VANISHING_POINT_X + Math.cos(rad) * JUDGEMENT_RADIUS;
        const yPosition = VANISHING_POINT_Y + Math.sin(rad) * JUDGEMENT_RADIUS;
        const isPressed = !!pressedLanes[lane];

        const handleMouseDown = () => {
          setPressedState(lane, true);
          onPadHit(lane);
        };

        const handleMouseUp = () => {
          setPressedState(lane, false);
        };

        return (
          <motion.button
            key={`pad-${lane}`}
            className="absolute w-14 h-14 rounded-lg font-bold font-rajdhani text-white text-sm focus:outline-none pointer-events-auto transition-all duration-150"
            style={{
              left: `${xPosition}px`,
              top: `${yPosition}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: isPressed ? color : hexToRgba(color, 0.25),
              border: `2px solid ${color}`,
              boxShadow: isPressed 
                ? `0 0 30px ${color}, 0 0 60px ${color}, inset 0 0 15px ${color}`
                : `0 0 15px ${hexToRgba(color, 0.5)}`,
            }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            data-testid={`pad-button-${lane}`}
          >
            {key}
          </motion.button>
        );
      })}
    </div>
  );
}
