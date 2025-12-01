// src/hooks/useConsoleLogger.ts
import * as React from "react";
import { useConsoleLogStore } from '@/stores/useConsoleLogStore';

/**
 * useConsoleLogger - Captures filtered console output for diagnostics
 *
 * Intercepts console.log, console.warn, console.error and stores important entries
 * in Zustand store for later export. Filters out spam and only captures
 * tagged logs and errors.
 */
export function useConsoleLogger() {
  React.useEffect(() => {
    const logEntries: any[] = []; // Temp for capture; store pushes to Zustand
    const startTime = Date.now();
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    // Only capture important logs (avoid spam like YouTube messages)
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
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

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