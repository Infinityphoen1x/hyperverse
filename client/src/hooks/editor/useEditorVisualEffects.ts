/**
 * Hook to manage visual effects (SPIN/ZOOM) during editor playback
 * Triggers tunnel rotation and zoom based on active hold notes
 */

import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { Note } from '@/types/game';

interface UseEditorVisualEffectsProps {
  notes: Note[];
  currentTime: number;
  isPlaying: boolean;
  spinEnabled: boolean;
  zoomEnabled: boolean;
}

export function useEditorVisualEffects({
  notes,
  currentTime,
  isPlaying,
  spinEnabled,
  zoomEnabled,
}: UseEditorVisualEffectsProps) {
  const setTunnelRotation = useGameStore(state => state.setTunnelRotation);
  
  useEffect(() => {
    if (!isPlaying) return;
    
    // Find currently active hold notes on horizontal positions (-1, -2)
    const activeLeftDeck = notes.find(n => 
      n.type === 'HOLD' &&
      n.lane === -1 && // DEPRECATED: note.lane field, treat as horizontal position -1
      currentTime >= n.time &&
      currentTime <= (n.time + (n.duration || 0))
    );
    
    const activeRightDeck = notes.find(n => 
      n.type === 'HOLD' &&
      n.lane === -2 && // DEPRECATED: note.lane field, treat as horizontal position -2
      currentTime >= n.time &&
      currentTime <= (n.time + (n.duration || 0))
    );
    
    // Both horizontal positions active = ZOOM (both aligned horizontally, diamond positions rotate to align)
    // One horizontal position active = SPIN (that deck aligned horizontally)
    if (spinEnabled) {
      if (activeLeftDeck && activeRightDeck) {
        // ZOOM: Align left deck to 180° (horizontal left)
        setTunnelRotation(180);
      } else if (activeLeftDeck) {
        // SPIN left: Align horizontal position -1 to 180° (horizontal left)
        setTunnelRotation(180);
      } else if (activeRightDeck) {
        // SPIN right: Align horizontal position -2 to 0° (horizontal right)
        setTunnelRotation(0);
      } else {
        // No horizontal position holds active: reset to 0°
        setTunnelRotation(0);
      }
    }
  }, [notes, currentTime, isPlaying, spinEnabled, setTunnelRotation]);
}
