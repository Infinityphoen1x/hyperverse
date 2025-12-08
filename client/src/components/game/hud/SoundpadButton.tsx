// src/components/SoundpadButton.tsx
import React, { useState, useEffect } from 'react';
import { BUTTON_CONFIG } from '@/lib/config';
import { useGameStore } from '@/stores/useGameStore';

interface SoundpadButtonProps {
  lane: number;
  position: { cx: number; cy: number };
  onPadHit: (lane: number) => void;
}

export const SoundpadButton: React.FC<SoundpadButtonProps> = ({ lane, position, onPadHit }) => {
  const { key, color } = BUTTON_CONFIG.find(config => config.lane === lane)!;
  const { cx, cy } = position;
  const notes = useGameStore(state => state.notes);
  
  // Track if a successful tap hit just occurred on this lane
  const [isGlowing, setIsGlowing] = useState(false);
  
  // Check for successful hits on this lane
  useEffect(() => {
    const recentHit = notes.find(n => 
      n.lane === lane && 
      n.hit && 
      n.type === 'TAP' && 
      n.hitTime && 
      Date.now() - n.hitTime < 200 // Glow for 200ms
    );
    
    if (recentHit && !isGlowing) {
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 200);
    }
  }, [notes, lane, isGlowing]);

  return (
    <g data-testid={`soundpad-button-${lane}`}>
      {/* Very low opacity fill */}
      <rect
        x={cx - 20}
        y={cy - 20}
        width="40"
        height="40"
        rx="8"
        ry="8"
        fill={color}
        fillOpacity="0.05"
        stroke="none"
        style={{ cursor: 'pointer' }}
        onMouseDown={(e) => {
          e.preventDefault();
          onPadHit(lane);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          onPadHit(lane);
        }}
      />
      
      {/* Neon glowing border */}
      <rect
        x={cx - 20}
        y={cy - 20}
        width="40"
        height="40"
        rx="8"
        ry="8"
        fill="none"
        stroke={color}
        strokeWidth={isGlowing ? "3" : "2"}
        opacity={isGlowing ? "1" : "0.6"}
        filter={isGlowing ? "url(#neon-glow)" : "none"}
        style={{ pointerEvents: 'none', transition: 'all 0.1s ease-out' }}
      />
      
      {/* Label with same color as border */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize="14"
        fontWeight="bold"
        fontFamily="Rajdhani, monospace"
        opacity={isGlowing ? "1" : "0.6"}
        filter={isGlowing ? "url(#neon-glow)" : "none"}
        style={{ pointerEvents: 'none', transition: 'all 0.1s ease-out' }}
      >
        {key}
      </text>
      
      {/* Glow filter definition (only render once per button) */}
      <defs>
        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </g>
  );
};