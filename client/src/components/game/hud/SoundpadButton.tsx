// src/components/SoundpadButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { BUTTON_CONFIG } from '@/lib/config';
import { useGameStore } from '@/stores/useGameStore';

interface SoundpadButtonProps {
  position: number; // Diamond position (0-3)
  coordinates: { cx: number; cy: number };
  onPadHit: (position: number) => void;
}

export const SoundpadButton: React.FC<SoundpadButtonProps> = ({ position, coordinates, onPadHit }) => {
  const { key, color } = BUTTON_CONFIG.find(config => config.lane === position)!; // BUTTON_CONFIG still uses 'lane' field
  const { cx, cy } = coordinates;
  const notes = useGameStore(state => state.notes);
  
  // Track if a successful tap hit just occurred on this position
  const [isGlowing, setIsGlowing] = useState(false);
  const glowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processedNotesRef = useRef<Set<string>>(new Set());
  
  // Check for successful hits on this position
  useEffect(() => {
    const recentHit = notes.find(n => 
      n.lane === position && // DEPRECATED: note.lane field, treat as position
      n.hit && 
      n.type === 'TAP' && 
      !n.missed && 
      !n.tapMissFailure && 
      !n.tapTooEarlyFailure &&
      !processedNotesRef.current.has(n.id) // Only process notes we haven't glowed for yet
    );
    
    if (recentHit) {
      // Mark this note as processed
      processedNotesRef.current.add(recentHit.id);
      
      setIsGlowing(true);
      
      // Clear any existing timeout
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
      
      // Set new timeout to turn off glow
      glowTimeoutRef.current = setTimeout(() => {
        setIsGlowing(false);
        glowTimeoutRef.current = null;
      }, 200);
    }
    
    // Cleanup on unmount
    return () => {
      if (glowTimeoutRef.current) {
        clearTimeout(glowTimeoutRef.current);
      }
    };
  }, [notes, position]);

  return (
    <g data-testid={`soundpad-button-${position}`}>
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
          onPadHit(position);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          onPadHit(position);
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