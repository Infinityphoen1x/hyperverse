// src/components/JudgementLines.tsx
import React from 'react';
import { useGameStore } from '@/stores/useGameStore'; // Assumes store with viewport state
import { TapJudgementLines } from './TapJudgementLines';
import { HoldJudgementLines } from './HoldJudgementLines';

interface JudgementLinesProps {
  // Optional overrides; defaults to store for global sync
  vpX?: number;
  vpY?: number;
  type: 'tap' | 'hold';
}

export function JudgementLines({ vpX: propVpX, vpY: propVpY, type }: JudgementLinesProps) {
  // Pull from Zustand (fallback to props for testing/flexibility)
  const { vpX, vpY } = useGameStore(state => ({
    vpX: propVpX ?? state.vpX,
    vpY: propVpY ?? state.vpY,
  }));

  return type === 'tap' ? (
    <TapJudgementLines vpX={vpX} vpY={vpY} />
  ) : (
    <HoldJudgementLines vpX={vpX} vpY={vpY} />
  );
}