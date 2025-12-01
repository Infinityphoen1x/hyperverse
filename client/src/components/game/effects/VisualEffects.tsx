// src/components/VisualEffects.tsx
import React from 'react';
import { useParticles } from '@/hooks/useParticles'; // New hook
import { useShake } from '@/hooks/useShake';
import { useChromatic } from '@/hooks/useChromatic';
import { useGlitch } from '@/hooks/useGlitch';
import ParticleSystem from '@/components/ParticleSystem';
import GlitchOverlay from '@/components/GlitchOverlay';
import ChromaticAberration from '@/components/ChromaticAberration';
import PerfectPulse from '@/components/PerfectPulse';
import { 
  MAX_HEALTH, LOW_HEALTH_THRESHOLD, GREYSCALE_INTENSITY, COMBO_PERFECT_MILESTONE,
  COLOR_PARTICLE_GREEN, COLOR_PARTICLE_RED 
} from '@/lib/config/gameConstants';
import { GameErrors } from '@/lib/errors/errorLog';

interface VisualEffectsProps {
  combo: number;
  health?: number;
  missCount?: number;
}

export function VisualEffects({ combo, health = 100, missCount = 0 }: VisualEffectsProps) {
  // Validation (centralized)
  React.useEffect(() => {
    if (!Number.isFinite(combo) || combo < 0 || !Number.isFinite(health) || health < 0) {
      GameErrors.log(`VisualEffects: Invalid props - combo=${combo}, health=${health}`);
    }
  }, [combo, health]);

  // Hooks for effects (each manages own state/timers)
  const particles = useParticles({ combo });
  const { shakeOffset } = useShake({ combo });
  const chromaticIntensity = useChromatic({ combo });
  const { glitch, glitchPhase, glitchOpacityMultiplier } = useGlitch({ 
    missCount, 
    health, 
    prevMissCount: missCount - 1 // Derive or pass from parent state if needed
  });
  const showPerfectPulse = combo > 0 && combo % COMBO_PERFECT_MILESTONE === 0;
  const greyscaleIntensity = Math.max(0, (MAX_HEALTH - health) / MAX_HEALTH) * GREYSCALE_INTENSITY;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      style={{ 
        filter: `grayscale(${greyscaleIntensity})`,
        transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
      }}
    >
      <ParticleSystem particles={particles} />
      {glitch > 0 && (
        <GlitchOverlay 
          glitch={glitch} 
          glitchPhase={glitchPhase} 
          glitchOpacityMultiplier={glitchOpacityMultiplier} 
        />
      )}
      {chromaticIntensity > 0 && (
        <ChromaticAberration intensity={chromaticIntensity} />
      )}
      {showPerfectPulse && (
        <PerfectPulse combo={combo} />
      )}
    </div>
  );
}