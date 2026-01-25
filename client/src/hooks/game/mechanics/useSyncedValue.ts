// src/hooks/useSyncedValue.ts
import { useEffect, useRef, useState } from 'react';
import { StoreApi } from 'zustand';

export function useSyncedValue<T, State = any>(
  store: StoreApi<State>,
  selector: (state: State) => T,
  interval: number,
  isActive: boolean
): T {
  const [value, setValue] = useState<T>(() => selector(store.getState()));
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

    // Subscribe for reactive updates
    unsubRef.current = store.subscribe(
      (state: State) => {
        const newVal = selectorRef.current(state);
        setValue(newVal);
        lastUpdateRef.current = performance.now();
      }
    );

    // Fallback polling for non-reactive sources
    const checkUpdate = () => {
      const now = performance.now();
      if (now - lastUpdateRef.current >= interval) {
        const newValue = selectorRef.current(store.getState());
        setValue(newValue);
        lastUpdateRef.current = now;
      }
    };
    const intervalId = setInterval(checkUpdate, interval);

    return () => {
      unsubRef.current?.();
      clearInterval(intervalId);
      unsubRef.current = null;
    };
  }, [store, interval, isActive]);

  return value;
}