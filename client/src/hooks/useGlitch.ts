// src/hooks/useGlitch.ts
import { useState, useEffect, useRef } from 'react';
import { GlitchState } from '@/types/visualEffects';
import { LOW_HEALTH_THRESHOLD, GLITCH_BASE_INTERVAL, GLITCH_RANDOM_RANGE, GLITCH_OPACITY, GREYSCALE_INTENSITY } from '@/lib/config/gameConstants';
import { toggleGlitchState } from '@/lib/utils/visualEffectsUtils';

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

  // Miss glitch
  useEffect(() => {
    if (missCount > prevMiss) {
      setGlitch(1);
      setGlitchPhase(0);
      setPrevMiss(missCount);

      if (missIntervalRef.current) clearInterval(missIntervalRef.current);
      
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
    }

    return () => {
      if (missIntervalRef.current) {
        clearInterval(missIntervalRef.current);
        missIntervalRef.current = null;
      }
    };
  }, [missCount, prevMiss]);

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