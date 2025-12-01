// src/components/VisualEffects.tsx
import React, { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Your game store (e.g., with combo, health, missCount)
import { useParticles } from '@/hooks/useParticles';
import { useShake } from '@/hooks/useShake';
import { useChromatic } from '@/hooks/useChromatic';
import { useGlitch } from '@/hooks/useGlitch';
import { ParticleSystem } from '@/components/game/effects/ParticleSystem';
import { GlitchOverlay } from '@/components/game/effects/GlitchOverlay';
import { ChromaticAberration } from '@/components/game/effects/ChromaticAberration';
import { PerfectPulse } from '@/components/game/effects/PerfectPulse';
import { MAX_HEALTH, LOW_HEALTH_THRESHOLD, COMBO_PERFECT_MILESTONE, GREYSCALE_INTENSITY, GLITCH_BACKGROUND_SIZE } from '@/lib/config/gameConstants';
import { GameErrors } from '@/lib/errors/errorLog';

interface VisualEffectsProps {
  // Optional: Override with local props if needed; defaults to store
  combo?: number;
  health?: number;
  missCount?: number;
}

export function VisualEffects({ combo: propCombo, health: propHealth, missCount: propMissCount }: VisualEffectsProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { combo, health = 100, missCount = 0 } = useGameStore(state => ({
    combo: propCombo ?? state.combo,
    health: propHealth ?? state.health,
    missCount: propMissCount ?? state.missCount,
  }));

  // Validation (runs on prop/store changes)
  useEffect(() => {
    if (!Number.isFinite(combo) || combo < 0 || !Number.isFinite(health) || health < 0 || !Number.isFinite(missCount)) {
      GameErrors.log(`VisualEffects: Invalid state - combo=${combo}, health=${health}, missCount=${missCount}`);
    }
  }, [combo, health, missCount]);

  const particles = useParticles();
  const shakeOffset = useShake();
  const chromaticIntensity = useChromatic({ combo });
  const { glitch, glitchPhase, glitchOpacityMultiplier } = useGlitch({ 
    missCount, 
    health, 
    prevMissCount: missCount // Assumes store tracks increments; adjust if using a ref
  });
  const showPerfectPulse = combo > 0 && combo % COMBO_PERFECT_MILESTONE === 0;
  const greyscaleIntensity = Math.max(0, (MAX_HEALTH - health) / MAX_HEALTH) * GREYSCALE_INTENSITY;

  // Glitch CSS init (once, outside deps)
  useEffect(() => {
    const existingStyle = document.querySelector('style[data-glitch]');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes glitch-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 ${GLITCH_BACKGROUND_SIZE}px; }
        }
      `;
      style.setAttribute('data-glitch', 'true');
      document.head.appendChild(style);
    }
  }, []);

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
      {chromaticIntensity > 0 && <ChromaticAberration intensity={chromaticIntensity} />}
      {showPerfectPulse && <PerfectPulse combo={combo} />}
    </div>
  );
}