import React, { useEffect } from "react";
import { Note } from '@/lib/engine/gameTypes';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/utils/gameConstants';
import { useVanishingPointOffset } from '@/hooks/useVanishingPointOffset';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useVisibleNotes } from '@/hooks/useVisibleNotes';
import { TunnelBackground } from './tunnel/TunnelBackground';
import { SoundpadButtons } from './ui/SoundpadButtons';
import { JudgementLines } from './tunnel/JudgementLines';
import { HoldNotes } from './notes/HoldNotes';
import { TapNotes } from './notes/TapNotes';

interface Down3DNoteLaneProps {
  notes: Note[];
  currentTime: number;
  health?: number;
  combo?: number;
  onPadHit?: (lane: number) => void;
  onDeckHoldStart?: (lane: number) => void;
  onDeckHoldEnd?: (lane: number) => void;
}

export function Down3DNoteLane({
  notes,
  currentTime,
  health = 100,
  combo = 0,
  onPadHit,
  onDeckHoldStart,
  onDeckHoldEnd,
}: Down3DNoteLaneProps) {
  const vpOffset = useVanishingPointOffset(combo);
  useKeyboardControls({ onPadHit, onDeckHoldStart, onDeckHoldEnd });
  const visibleNotes = useVisibleNotes(notes, currentTime);

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
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <TunnelBackground vpX={vpX} vpY={vpY} hexCenterX={hexCenterX} hexCenterY={hexCenterY} health={health} />
      <SoundpadButtons onPadHit={onPadHit} />
      <JudgementLines vpX={vpX} vpY={vpY} type="tap" />
      <HoldNotes visibleNotes={visibleNotes} currentTime={currentTime} vpX={vpX} vpY={vpY} />
      <JudgementLines vpX={vpX} vpY={vpY} type="hold" />
      <TapNotes visibleNotes={visibleNotes} currentTime={currentTime} vpX={vpX} vpY={vpY} />
    </div>
  );
}
