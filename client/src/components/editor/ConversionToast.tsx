/**
 * Conversion feedback toast
 * Shows when notes auto-convert between TAP and HOLD
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversionToast {
  id: string;
  message: string;
  timestamp: number;
}

let toastQueue: ConversionToast[] = [];
let notifyListeners: (() => void)[] = [];

export const ConversionFeedback = {
  show: (message: string) => {
    const toast: ConversionToast = {
      id: `toast-${Date.now()}-${Math.random()}`,
      message,
      timestamp: Date.now(),
    };
    toastQueue.push(toast);
    notifyListeners.forEach(fn => fn());
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== toast.id);
      notifyListeners.forEach(fn => fn());
    }, 2000);
  },
};

export function ConversionToastContainer() {
  const [toasts, setToasts] = useState<ConversionToast[]>([]);

  useEffect(() => {
    const updateToasts = () => setToasts([...toastQueue]);
    notifyListeners.push(updateToasts);
    
    return () => {
      notifyListeners = notifyListeners.filter(fn => fn !== updateToasts);
    };
  }, []);

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: index * 60, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="bg-cyan-900/90 border-2 border-cyan-400 rounded-lg px-4 py-2 text-cyan-100 text-sm font-rajdhani font-bold shadow-lg mb-2"
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
