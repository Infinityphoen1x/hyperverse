import { useEffect } from "react";
import { BUTTON_CONFIG } from '@/lib/utils/gameConstants';

interface UseKeyboardControlsProps {
  onPadHit?: (lane: number) => void;
  onDeckHoldStart?: (lane: number) => void;
  onDeckHoldEnd?: (lane: number) => void;
}

export function useKeyboardControls({ onPadHit, onDeckHoldStart, onDeckHoldEnd }: UseKeyboardControlsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const config = BUTTON_CONFIG.find((c) => c.key.toLowerCase() === key);
      if (config) {
        if (config.lane >= 0 && config.lane <= 3 && onPadHit) {
          onPadHit(config.lane);
        } else if ((config.lane === -1 || config.lane === -2) && onDeckHoldStart) {
          onDeckHoldStart(config.lane);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const config = BUTTON_CONFIG.find((c) => c.key.toLowerCase() === key);
      if (config && (config.lane === -1 || config.lane === -2) && onDeckHoldEnd) {
        onDeckHoldEnd(config.lane);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onPadHit, onDeckHoldStart, onDeckHoldEnd]);
}
