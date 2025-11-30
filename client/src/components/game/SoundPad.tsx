import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { ACTIVATION_WINDOW, HIT_SUCCESS_DURATION, SOUNDPAD_COLORS, SOUNDPAD_STYLES, VANISHING_POINT_X, VANISHING_POINT_Y, HEXAGON_RADII, BUTTON_CONFIG } from '@/lib/utils/gameConstants';

interface SoundPadProps {
  onPadHit: (index: number) => void;
  notes: Note[];
  currentTime: number;
}

// Calculate fixed hexagon corner positions for all lanes (soundpad + deck)
// Uses outermost hexagon radius (248px) to match the tunnel's fixed outer boundary
const getPadPosition = (laneIndex: number): { x: number; y: number } => {
  let config;
  if (laneIndex === -1) {
    config = BUTTON_CONFIG[4]; // Q - left deck
  } else if (laneIndex === -2) {
    config = BUTTON_CONFIG[5]; // P - right deck
  } else {
    config = BUTTON_CONFIG[laneIndex];
  }
  if (!config) return { x: 0, y: 0 };
  const rad = (config.angle * Math.PI) / 180;
  const outerHexagonRadius = HEXAGON_RADII[HEXAGON_RADII.length - 1]; // 248px - outermost hexagon
  const x = VANISHING_POINT_X + Math.cos(rad) * outerHexagonRadius;
  const y = VANISHING_POINT_Y + Math.sin(rad) * outerHexagonRadius;
  return { x, y };
};

export function SoundPad({ onPadHit, notes, currentTime }: SoundPadProps) {
  const [hitFeedback, setHitFeedback] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false, 3: false, '-1': false, '-2': false });
  
  // Validate pad index with bounds checking
  const isValidPadIndex = (index: number): boolean => {
    return Number.isFinite(index) && index >= 0 && index <= 3;
  };

  // Hit detection and feedback trigger - pass callback directly instead of window events
  const checkHitAndTriggerFeedback = useCallback((index: number) => {
    try {
      if (!isValidPadIndex(index)) {
        GameErrors.log(`SoundPad: Invalid pad index ${index}`);
        return;
      }
      
      // Trigger game engine hit
      onPadHit(index);
      
      // Check for hittable note in this lane within activation window
      if (!Array.isArray(notes)) {
        GameErrors.log(`SoundPad: Notes is not an array`);
        return;
      }
      
      // Find hittable note on this lane (don't filter twice - check directly)
      const hasHittableNote = notes.some(n => 
        n && 
        Number.isFinite(n.lane) && n.lane === index &&
        !n.hit && !n.missed && !n.tapMissFailure && 
        Number.isFinite(n.time) && 
        Math.abs(n.time - currentTime) < ACTIVATION_WINDOW
      );
      
      // Trigger visual feedback if hit is valid
      if (hasHittableNote) {
        setHitFeedback(prev => ({ ...prev, [index]: true }));
      }
    } catch (error) {
      GameErrors.log(`SoundPad: checkHitAndTriggerFeedback error for pad ${index}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [onPadHit, notes, currentTime]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'w': checkHitAndTriggerFeedback(0); break;
        case 'o': checkHitAndTriggerFeedback(1); break;
        case 'i': checkHitAndTriggerFeedback(2); break;
        case 'e': checkHitAndTriggerFeedback(3); break;
        case 'q': checkHitAndTriggerFeedback(-1); break;
        case 'p': checkHitAndTriggerFeedback(-2); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkHitAndTriggerFeedback]);

  // Clear hit feedback after duration
  useEffect(() => {
    const activeHits = Object.entries(hitFeedback).filter(([_, isActive]) => isActive);
    if (activeHits.length === 0) return;
    
    const timer = setTimeout(() => {
      setHitFeedback(prev => {
        const updated = { ...prev };
        activeHits.forEach(([index]) => {
          updated[parseInt(index)] = false;
        });
        return updated;
      });
    }, HIT_SUCCESS_DURATION);
    
    return () => clearTimeout(timer);
  }, [hitFeedback]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {[0, 1, 2, 3, -1, -2].map((i) => {
        const pos = getPadPosition(i);
        let config;
        if (i === -1) {
          config = BUTTON_CONFIG[4];
        } else if (i === -2) {
          config = BUTTON_CONFIG[5];
        } else {
          config = BUTTON_CONFIG[i];
        }
        if (!config) return null;
        
        const isPressed = hitFeedback[i];
        
        return (
          <motion.button
            key={`soundpad-${i}`}
            className="absolute w-14 h-14 rounded-lg font-bold font-rajdhani text-white text-sm focus:outline-none pointer-events-auto transition-all duration-150"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: isPressed ? config.color : `${config.color}40`,
              border: `2px solid ${config.color}`,
              boxShadow: isPressed 
                ? `0 0 30px ${config.color}, 0 0 60px ${config.color}, inset 0 0 15px ${config.color}`
                : `0 0 15px ${config.color}66`,
            }}
            whileTap={{ scale: 0.9 }}
            onMouseDown={() => checkHitAndTriggerFeedback(i)}
            onMouseUp={() => {}}
            onMouseLeave={() => {}}
            data-testid={`soundpad-${i}`}
            onClick={(e) => {
              e.preventDefault();
              checkHitAndTriggerFeedback(i);
            }}
          >
            {config.key}
          </motion.button>
        );
      })}
    </div>
  );
}
