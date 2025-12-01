// src/hooks/useSyncedValue.ts
import { useEffect, useRef, useState } from 'react';
import { StoreApi } from 'zustand'; // For typing

export function useSyncedValue<T, S extends StoreApi<any>>(
  store: S,
  selector: (state: Parameters<S['getState']>[0]) => T,
  interval: number,
  isActive: boolean
): T {
  const [value, setValue] = useState<T>(selector(store.getState()));
  const lastUpdateRef = useRef<number>(0);
  const selectorRef = useRef(selector);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    selectorRef.current = selector;
  }, [selector]);

  useEffect(() => {
    if (!isActive) {
      unsubRef.current?.();
      unsubRef.current = null;
      return;
    }

    // Immediate sync
    const newValue = selectorRef.current(store.getState());
    setValue(newValue);
    lastUpdateRef.current = performance.now();

    // Subscribe for reactive updates (with equality check)
    unsubRef.current = store.subscribe(
      (state) => selectorRef.current(state),
      (newVal) => setValue(newVal),
      { equalityFn: (a, b) => a === b } // Shallow equality for perf
    );

    // Fallback polling for non-reactive sources
    const checkUpdate = () => {
      const now = performance.now();
      if (now - lastUpdateRef.current >= interval) {
        const newValue = selectorRef.current(store.getState());
        if (newValue !== value) { // Avoid setState if unchanged
          setValue(newValue);
        }
        lastUpdateRef.current = now;
      }
    };
    const intervalId = setInterval(checkUpdate, interval);

    return () => {
      unsubRef.current?.();
      clearInterval(intervalId);
    };
  }, [store, interval, isActive]);

  return value;
}