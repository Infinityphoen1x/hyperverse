import { useRef, useEffect } from 'react';
import { useDebugValue as useReactDebugValue } from 'react';
import { GameDebugger } from './gameDebugTools';

export function useGameDebugger(enabled: boolean = true): GameDebugger {
  const debuggerRef = useRef<GameDebugger | undefined>(undefined);
  
  if (!debuggerRef.current) {
    debuggerRef.current = new GameDebugger(enabled);
  }

  useEffect(() => {
    return () => {
      debuggerRef.current?.clear();
    };
  }, []);

  return debuggerRef.current;
}

export function useDebugValue(debugValue: GameDebugger): void {
  const stats = {
    animations: debugValue.getAnimationStats(),
    notes: debugValue.getNoteStats(),
    hits: debugValue.getHitStats(),
    render: debugValue.getRenderStats(),
  };

  useReactDebugValue(stats);
}
