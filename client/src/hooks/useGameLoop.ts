// src/hooks/useGameLoop.ts
import { useEffect, useRef } from 'react';

interface GameLoopCallbacks {
  onFrame: (currentTime: number) => void;
  onGameOver?: () => void;
}

export function useGameLoop(
  isActive: boolean,
  callbacks: GameLoopCallbacks
): void {
  const requestRef = useRef<number | undefined>(undefined);
  const callbacksRef = useRef<GameLoopCallbacks>(callbacks);

  // Keep callbacks fresh without restarting loop
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!isActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
      return;
    }

    const loop = () => {
      callbacksRef.current.onFrame(performance.now());
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive]);
}