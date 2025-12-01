// src/components/Down3DNoteLane.tsx
import React, { useEffect } from "react";
import { Note } from '@/lib/engine/gameTypes';
import { VANISHING_POINT_X, VANISHING_POINT_Y } from '@/lib/config/gameConstants';
import { useVanishingPointOffset } from '@/hooks/useVanishingPointOffset';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useVisibleNotes } from '@/hooks/useVisibleNotes';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with game state/actions
import { TunnelBackground } from './tunnel/TunnelBackground';
import { SoundpadButtons } from './hud/SoundpadButtons';
import { JudgementLines } from './tunnel/JudgementLines';
import { HoldNotes } from './notes/HoldNotes';
import { TapNotes } from './notes/TapNotes';

interface Down3DNoteLaneProps {
  // Optional overrides; defaults to store for global sync
  notes?: Note[];
  currentTime?: number;
  health?: number;
  combo?: number;
}

export function Down3DNoteLane({
  notes: propNotes,
  currentTime: propCurrentTime,
  health: propHealth,
  combo: propCombo,
}: Down3DNoteLaneProps = {}) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { 
    notes, 
    currentTime, 
    health = 100, 
    combo = 0,
    hitPad, // Store action for pad hits
    startDeckHold, // Store action for hold start
    endDeckHold, // Store action for hold end
  } = useGameStore(state => ({
    notes: propNotes ?? state.notes,
    currentTime: propCurrentTime ?? state.currentTime,
    health: propHealth ?? state.health,
    combo: propCombo ?? state.combo,
    hitPad: state.hitPad,
    startDeckHold: state.startDeckHold,
    endDeckHold: state.endDeckHold,
  }));

  const vpOffset = useVanishingPointOffset(combo);
  useKeyboardControls({ onPadHit: hitPad, onDeckHoldStart: startDeckHold, onDeckHoldEnd: endDeckHold });
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
      <SoundpadButtons vpX={vpX} vpY={vpY} onPadHit={hitPad} />
      <JudgementLines vpX={vpX} vpY={vpY} type="tap" />
      <HoldNotes visibleNotes={visibleNotes} currentTime={currentTime} vpX={vpX} vpY={vpY} />
      <JudgementLines vpX={vpX} vpY={vpY} type="hold" />
      <TapNotes visibleNotes={visibleNotes} currentTime={currentTime} vpX={vpX} vpY={vpY} />
    </div>
  );
}