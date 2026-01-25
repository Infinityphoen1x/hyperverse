import { useEffect } from 'react';
import { useConsoleLogStore } from '@/stores/useConsoleLogStore';

export function useConsoleLogger() {
  useEffect(() => {
    const startTime = Date.now();
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const shouldCapture = (message: string): boolean => {
      return (
        message.includes('[CRITICAL]') ||
        message.includes('[ERROR]') ||
        message.includes('[WARN]') ||
        message.includes('[ENGINE]') ||
        message.includes('[RESUME]') ||
        message.includes('[SYNC]') ||
        message.includes('[FRAME]') ||
        message.includes('[GAME-OVER]') ||
        message.includes('[SYSTEM]')
      );
    };

const captureLog = (level: string, ...args: any[]) => {
  const message = args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        return JSON.stringify(arg);
      } catch (e) {
        // Fallback for circular refs (e.g., DOM elements, React Fiber)
        return `[${arg.constructor?.name || 'Object'} - circular reference]`;
      }
    }
    return String(arg);
  }).join(' ');

  if (level === 'error' || level === 'warn' || shouldCapture(message)) {
    useConsoleLogStore.getState().addLog({
      t: Date.now() - startTime,
      l: level as 'log' | 'warn' | 'error',
      m: message
    });
  }
};

    console.log = (...args) => {
      originalLog(...args);
      captureLog('log', ...args);
    };
    console.warn = (...args) => {
      originalWarn(...args);
      captureLog('warn', ...args);
    };
    console.error = (...args) => {
      originalError(...args);
      captureLog('error', ...args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);
}