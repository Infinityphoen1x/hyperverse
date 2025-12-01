// src/components/Down3DNoteLane.tsx
import React, { memo, useEffect } from "react";
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config/gameConstants';
import { useVanishingPointOffset } from '@/hooks/useVanishingPointOffset';
import { useGameStore } from '@/stores/useGameStore';
import { TunnelBackground } from './tunnel/TunnelBackground';
import { SoundpadButtons } from './hud/SoundpadButtons';
import { JudgementLines } from './tunnel/JudgementLines';
import { HoldNotes } from './notes/HoldNotes';
import { TapNotes } from './notes/TapNotes';

interface Down3DNoteLaneProps {
  health?: number;
  combo?: number;
}

const Down3DNoteLaneComponent = ({
  health: propHealth,
  combo: propCombo,
}: Down3DNoteLaneProps = {}) => {
  // Select atomic values to prevent unnecessary re-renders
  const health = useGameStore(state => propHealth ?? state.health);
  const combo = useGameStore(state => propCombo ?? state.combo);

  const vpOffset = useVanishingPointOffset();
  
  const vpX = VANISHING_POINT_X + vpOffset.x;
  const vpY = VANISHING_POINT_Y + vpOffset.y;
  const hexCenterX = VANISHING_POINT_X;
  const hexCenterY = VANISHING_POINT_Y;

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
      <SoundpadButtons vpX={vpX} vpY={vpY} />
      <JudgementLines vpX={vpX} vpY={vpY} type="tap" />
      <HoldNotes vpX={vpX} vpY={vpY} />
      <JudgementLines vpX={vpX} vpY={vpY} type="hold" />
      <TapNotes vpX={vpX} vpY={vpY} />
    </div>
  );
};

export const Down3DNoteLane = memo(Down3DNoteLaneComponent);