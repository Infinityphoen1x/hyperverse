// src/components/GlitchOverlay.tsx
import { GLITCH_BACKGROUND_SIZE, GLITCH_OPACITY } from '@/lib/config/gameConstants';

interface GlitchOverlayProps { glitch: number; glitchPhase: number; glitchOpacityMultiplier: number; }

export const GlitchOverlay: React.FC<GlitchOverlayProps> = ({ glitch, glitchPhase, glitchOpacityMultiplier }) => (
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `linear-gradient(
        0deg,
        rgba(255, 0, 127, ${Math.min(glitch * GLITCH_OPACITY * glitchOpacityMultiplier, 1)}) 0%,
        transparent 2%,
        transparent 8%,
        rgba(0, 255, 255, ${Math.min(glitch * GLITCH_OPACITY * glitchOpacityMultiplier, 1)}) 10%,
        transparent 12%
      )`,
      backgroundSize: `100% ${GLITCH_BACKGROUND_SIZE}px`,
      backgroundPosition: `0 ${glitchPhase * GLITCH_BACKGROUND_SIZE}px`,
      animation: `glitch-scroll ${0.1 + glitchPhase * 0.2}s linear infinite`,
    }}
  />
);