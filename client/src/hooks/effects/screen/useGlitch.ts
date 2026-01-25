// src/hooks/useGlitch.ts
import { useState, useEffect, useRef } from 'react';
import { GlitchState } from '@/types/visualEffects';
import { LOW_HEALTH_THRESHOLD, GLITCH_BASE_INTERVAL, GLITCH_RANDOM_RANGE, GLITCH_OPACITY, GREYSCALE_INTENSITY } from '@/lib/config';
import { toggleGlitchState } from '@/lib/utils/visualEffectsUtils';
import { useShakeStore } from '@/stores/useShakeStore';

interface UseGlitchProps {
  missCount: number;
  health: number;
}

export const useGlitch = ({ missCount, health }: UseGlitchProps): GlitchState => {
  const [glitch, setGlitch] = useState(0);
  const [glitchPhase, setGlitchPhase] = useState(0);
  const prevMissRef = useRef(0);
  const lowHealthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shakeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const setShakeOffset = useShakeStore(state => state.setShakeOffset);

  // Reset effect when missCount drops to 0 (restart/rewind)
  useEffect(() => {
    if (missCount === 0) {
      setGlitch(0);
      setGlitchPhase(0);
      prevMissRef.current = 0;
      // Clear all intervals
      if (shakeIntervalRef.current) {
        clearInterval(shakeIntervalRef.current);
        shakeIntervalRef.current = null;
      }
      if (lowHealthIntervalRef.current) {
        clearInterval(lowHealthIntervalRef.current);
        lowHealthIntervalRef.current = null;
      }
    }
  }, [missCount]);

  // Screen shake on miss (no glitch)
  useEffect(() => {
    if (missCount > prevMissRef.current) {
      console.log('[SHAKE] Miss detected! missCount:', missCount, 'prevMiss:', prevMissRef.current);
      prevMissRef.current = missCount;

      // Clear existing shake interval
      if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
      
      // Screen shake animation
      const SHAKE_DURATION = 300; // ms
      const SHAKE_INTERVAL = 50;  // ms (~20Hz)
      const SHAKE_MAX_OFFSET = 16; // pixels
      let elapsed = 0;
      
      console.log('[SHAKE] Starting shake animation');
      
      shakeIntervalRef.current = setInterval(() => {
        elapsed += SHAKE_INTERVAL;
        
        if (elapsed >= SHAKE_DURATION) {
          setShakeOffset({ x: 0, y: 0 }); // Reset to center
          console.log('[SHAKE] Animation complete, reset to 0,0');
          if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
          shakeIntervalRef.current = null;
          return;
        }
        
        // Decay shake intensity over time
        const decay = 1 - (elapsed / SHAKE_DURATION);
        const x = (Math.random() - 0.5) * 2 * SHAKE_MAX_OFFSET * decay;
        const y = (Math.random() - 0.5) * 2 * SHAKE_MAX_OFFSET * decay;
        console.log('[SHAKE] Frame:', { x: x.toFixed(1), y: y.toFixed(1), elapsed });
        setShakeOffset({ x, y });
      }, SHAKE_INTERVAL);
    }

    return () => {
      if (shakeIntervalRef.current) {
        clearInterval(shakeIntervalRef.current);
        shakeIntervalRef.current = null;
        setShakeOffset({ x: 0, y: 0 });
      }
    };
  }, [missCount, setShakeOffset]);

  // Low health subtle glitch
  useEffect(() => {
    if (health < LOW_HEALTH_THRESHOLD) {
      if (lowHealthIntervalRef.current) clearInterval(lowHealthIntervalRef.current);
      
      const interval = GLITCH_BASE_INTERVAL + Math.random() * GLITCH_RANDOM_RANGE;
      lowHealthIntervalRef.current = setInterval(() => {
        setGlitch(prev => toggleGlitchState(prev, GLITCH_OPACITY));
      }, interval);
    } else {
      if (lowHealthIntervalRef.current) {
        clearInterval(lowHealthIntervalRef.current);
        lowHealthIntervalRef.current = null;
        setGlitch(0);
      }
    }

    return () => {
      if (lowHealthIntervalRef.current) {
        clearInterval(lowHealthIntervalRef.current);
        lowHealthIntervalRef.current = null;
      }
    };
  }, [health]);

  const glitchOpacityMultiplier = LOW_HEALTH_THRESHOLD > 0
    ? 1 + (Math.max(0, LOW_HEALTH_THRESHOLD - health) / LOW_HEALTH_THRESHOLD) * 2
    : 1;

  return { glitch, glitchPhase, glitchOpacityMultiplier };
};