// src/components/JudgementLines.tsx
import React, { memo } from 'react';
import { TapJudgementLines } from './TapJudgementLines';
import { HoldJudgementLines } from './HoldJudgementLines';

interface JudgementLinesProps {
  vpX?: number;
  vpY?: number;
  type: 'tap' | 'hold';
  zoomScale?: number;
}

const JudgementLinesComponent = ({ vpX = 350, vpY = 300, type, zoomScale = 1.0 }: JudgementLinesProps) => {
  return type === 'tap' ? (
    <TapJudgementLines vpX={vpX} vpY={vpY} zoomScale={zoomScale} data-testid="tap-judgement-lines" />
  ) : (
    <HoldJudgementLines vpX={vpX} vpY={vpY} zoomScale={zoomScale} data-testid="hold-judgement-lines" />
  );
};

export const JudgementLines = memo(JudgementLinesComponent);