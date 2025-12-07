// src/hooks/useGlitch.ts
import { useState, useEffect, useRef } from 'react';
import { GlitchState } from '@/types/visualEffects';
import { LOW_HEALTH_THRESHOLD, GLITCH_BASE_INTERVAL, GLITCH_RANDOM_RANGE, GLITCH_OPACITY, GREYSCALE_INTENSITY } from '@/lib/config/gameConstants';
import { toggleGlitchState } from '@/lib/utils/visualEffectsUtils';
import { useShakeStore } from '@/stores/useShakeStore';

interface UseGlitchProps {
  missCount: number;
  health: number;
  prevMissCount: number;
}

export const useGlitch = ({ missCount, health, prevMissCount }: UseGlitchProps): GlitchState => {
  const [glitch, setGlitch] = useState(0);
  const [glitchPhase, setGlitchPhase] = useState(0);
  const [prevMiss, setPrevMiss] = useState(prevMissCount);
  const lowHealthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const missIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shakeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const setShakeOffset = useShakeStore(state => state.setShakeOffset);

  // Miss glitch + screen shake
  useEffect(() => {
    if (missCount > prevMiss) {
      setGlitch(1);
      setGlitchPhase(0);
      setPrevMiss(missCount);

      // Clear existing intervals
      if (missIntervalRef.current) clearInterval(missIntervalRef.current);
      if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
      
      // Glitch animation
      missIntervalRef.current = setInterval(() => {
        setGlitchPhase(prev => {
          const nextPhase = prev + 0.1;
          if (nextPhase >= 1) {
            setGlitch(0);
            if (missIntervalRef.current) clearInterval(missIntervalRef.current);
            missIntervalRef.current = null;
            return nextPhase;
          }
          return nextPhase;
        });
      }, 30);
      
      // Screen shake animation
      const SHAKE_DURATION = 300; // ms
      const SHAKE_INTERVAL = 50;  // ms (~20Hz)
      const SHAKE_MAX_OFFSET = 16; // pixels
      let elapsed = 0;
      
      shakeIntervalRef.current = setInterval(() => {
        elapsed += SHAKE_INTERVAL;
        
        if (elapsed >= SHAKE_DURATION) {
          setShakeOffset({ x: 0, y: 0 }); // Reset to center
          if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
          shakeIntervalRef.current = null;
          return;
        }
        
        // Decay shake intensity over time
        const decay = 1 - (elapsed / SHAKE_DURATION);
        const x = (Math.random() - 0.5) * 2 * SHAKE_MAX_OFFSET * decay;
        const y = (Math.random() - 0.5) * 2 * SHAKE_MAX_OFFSET * decay;
        setShakeOffset({ x, y });
      }, SHAKE_INTERVAL);
    }

    return () => {
      if (missIntervalRef.current) {
        clearInterval(missIntervalRef.current);
        missIntervalRef.current = null;
      }
      if (shakeIntervalRef.current) {
        clearInterval(shakeIntervalRef.current);
        shakeIntervalRef.current = null;
        setShakeOffset({ x: 0, y: 0 });
      }
    };
  }, [missCount, prevMiss, setShakeOffset]);

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