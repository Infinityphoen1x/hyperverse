import React from 'react';
import { JUDGEMENT_RADIUS, TAP_JUDGEMENT_LINE_WIDTH, HOLD_JUDGEMENT_LINE_WIDTH, COLOR_DECK_LEFT, COLOR_DECK_RIGHT } from '@/lib/config/gameConstants';

interface JudgementLinesProps {
  vpX: number;
  vpY: number;
  type: 'tap' | 'hold';
}

export function JudgementLines({ vpX, vpY, type }: JudgementLinesProps) {
  if (type === 'tap') {
    return (
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1, pointerEvents: 'none' }}>
        {[
          { angle: 120, color: '#FF007F', key: 'W' },
          { angle: 60, color: '#0096FF', key: 'O' },
          { angle: 300, color: '#BE00FF', key: 'I' },
          { angle: 240, color: '#00FFFF', key: 'E' },
        ].map((lane, idx) => {
          const rad = (lane.angle * Math.PI) / 180;
          const lineLength = TAP_JUDGEMENT_LINE_WIDTH;
          const cx = vpX + Math.cos(rad) * JUDGEMENT_RADIUS;
          const cy = vpY + Math.sin(rad) * JUDGEMENT_RADIUS;
          const perpRad = rad + Math.PI / 2;
          const x1 = cx + Math.cos(perpRad) * (lineLength / 2);
          const y1 = cy + Math.sin(perpRad) * (lineLength / 2);
          const x2 = cx - Math.cos(perpRad) * (lineLength / 2);
          const y2 = cy - Math.sin(perpRad) * (lineLength / 2);

          return (
            <g key={`judgement-line-${idx}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={lane.color} strokeWidth="2.5" opacity="1" strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 1, pointerEvents: 'none' }}>
      {[
        { angle: 180, color: COLOR_DECK_LEFT },
        { angle: 0, color: COLOR_DECK_RIGHT },
      ].map((lane, idx) => {
        const rad = (lane.angle * Math.PI) / 180;
        const lineLength = HOLD_JUDGEMENT_LINE_WIDTH;
        const cx = vpX + Math.cos(rad) * JUDGEMENT_RADIUS;
        const cy = vpY + Math.sin(rad) * JUDGEMENT_RADIUS;
        const perpRad = rad + Math.PI / 2;
        const x1 = cx + Math.cos(perpRad) * (lineLength / 2);
        const y1 = cy + Math.sin(perpRad) * (lineLength / 2);
        const x2 = cx - Math.cos(perpRad) * (lineLength / 2);
        const y2 = cy - Math.sin(perpRad) * (lineLength / 2);

        return (
          <line key={`hold-judgement-line-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={lane.color} strokeWidth="3" opacity="1" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}
