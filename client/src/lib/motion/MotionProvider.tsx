/**
 * LazyMotion wrapper for optimized Framer Motion imports
 * Reduces bundle size by ~50% by lazy-loading animation features
 * 
 * Use <MotionProvider> at the root of your app or per-route
 * Then use 'm' instead of 'motion' in components
 */

import { LazyMotion, domAnimation } from 'framer-motion';
import { ReactNode } from 'react';

interface MotionProviderProps {
  children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

// Re-export 'm' for easy imports
export { m } from 'framer-motion';
export { AnimatePresence } from 'framer-motion';
