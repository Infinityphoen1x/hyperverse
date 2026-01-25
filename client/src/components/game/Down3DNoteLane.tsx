// src/components/Down3DNoteLane.tsx
import React, { memo, useEffect } from "react";
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config';
import { useVanishingPointOffset } from '@/hooks/effects/geometry/useVanishingPointOffset';
import { useVanishingPointStore } from '@/stores/useVanishingPointStore';
import { useGameStore } from '@/stores/useGameStore';
import { useZoomEffect } from '@/hooks/effects/screen/useZoomEffect';
import { TunnelBackground } from './tunnel/TunnelBackground';
import { SoundpadButtons } from './hud/SoundpadButtons';
import { JudgementLines } from './tunnel/JudgementLines';
import { HoldNotes } from './notes/HoldNotes';
import { TapNotes } from './notes/TapNotes';

interface Down3DNoteLaneProps {
  health?: number;
  combo?: number;
  onPadHit?: (lane: number) => void;
}

const Down3DNoteLaneComponent = ({
  health: propHealth,
  combo: propCombo,
  onPadHit
}: Down3DNoteLaneProps = {}) => {
  // Select atomic values to prevent unnecessary re-renders
  const health = useGameStore(state => propHealth ?? state.health);
  const combo = useGameStore(state => propCombo ?? state.combo);
  const setVPOffset = useVanishingPointStore(state => state.setVPOffset);

  const vpOffset = useVanishingPointOffset();
  const { zoomScale } = useZoomEffect();
  
  const vpX = VANISHING_POINT_X + vpOffset.x;
  const vpY = VANISHING_POINT_Y + vpOffset.y;
  const hexCenterX = VANISHING_POINT_X;
  const hexCenterY = VANISHING_POINT_Y;

  // Dynamic vanishing point: smooth circular motion for 3D perspective wobble
  useEffect(() => {
    const VP_AMPLITUDE = 15; // ±15px offset from center
    const VP_CYCLE_DURATION = 8000; // 8 seconds per full cycle
    const VP_UPDATE_INTERVAL = 16; // ~60fps
    
    const intervalId = setInterval(() => {
      const elapsed = Date.now() % VP_CYCLE_DURATION;
      const progress = elapsed / VP_CYCLE_DURATION; // 0 to 1
      
      // Smooth circular motion using sine/cosine
      // Creates path: (x, -y) → (-x, -y) → (-x, y) → (x, y) → (0, 0)
      const angle = progress * Math.PI * 2; // 0 to 2π
      const x = Math.cos(angle) * VP_AMPLITUDE;
      const y = Math.sin(angle) * VP_AMPLITUDE;
      
      setVPOffset({ x, y });
    }, VP_UPDATE_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
      setVPOffset({ x: 0, y: 0 }); // Reset on unmount
    };
  }, [setVPOffset]);

  useEffect(() => {
    if (combo > 0 && combo % 5 === 0) {
      console.log(
        `[VP-RENDER] Combo ${combo}: vpOffset=[${vpOffset.x.toFixed(1)}, ${vpOffset.y.toFixed(1)}] → vpX=${vpX.toFixed(1)}, vpY=${vpY.toFixed(1)}`
      );
    }
  }, [vpOffset, combo, vpX, vpY]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" data-testid="down3d-note-lane">
      <TunnelBackground vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} health={health} />
      <SoundpadButtons vpX={vpX} vpY={vpY} onPadHit={onPadHit} zoomScale={zoomScale} />
      <JudgementLines vpX={vpX} vpY={vpY} type="tap" zoomScale={zoomScale} />
      <HoldNotes vpX={vpX} vpY={vpY} />
      <JudgementLines vpX={vpX} vpY={vpY} type="hold" zoomScale={zoomScale} />
      <TapNotes vpX={vpX} vpY={vpY} />
    </div>
  );
};

export const Down3DNoteLane = memo(Down3DNoteLaneComponent);