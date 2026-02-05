import { useState } from 'react';
import { m } from "@/lib/motion/MotionProvider";
import { X } from 'lucide-react';

interface BpmTapperModalProps {
  onClose: () => void;
  onBpmDetected: (bpm: number) => void;
}

export function BpmTapperModal({ onClose, onBpmDetected }: BpmTapperModalProps) {
  const [taps, setTaps] = useState<number[]>([]);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);

  const handleTap = () => {
    const now = Date.now();
    const newTaps = [...taps, now].slice(-8); // Keep last 8 taps
    setTaps(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      setDetectedBpm(bpm);
    }
  };

  const applyBpm = () => {
    if (detectedBpm) {
      onBpmDetected(detectedBpm);
      onClose();
    }
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <m.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-rajdhani text-neon-cyan font-bold">BPM TAPPER</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-400 font-rajdhani">
            Tap the button below to the beat of the music. The BPM will be calculated automatically.
          </p>

          <button
            onClick={handleTap}
            className="w-full py-12 bg-neon-pink border-2 border-neon-pink text-black rounded-lg text-2xl font-rajdhani font-bold hover:bg-neon-pink/80 transition-colors active:scale-95"
          >
            TAP HERE
          </button>

          {detectedBpm && (
            <div className="text-center">
              <div className="text-4xl font-rajdhani text-neon-cyan font-bold mb-2">
                {detectedBpm} BPM
              </div>
              <div className="text-xs text-gray-400 font-rajdhani">
                Based on {taps.length} taps
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setTaps([]); setDetectedBpm(null); }}
              className="flex-1 px-4 py-2 bg-transparent border border-gray-600 text-gray-400 rounded font-rajdhani hover:border-neon-cyan hover:text-neon-cyan transition-colors"
            >
              RESET
            </button>
            <button
              onClick={applyBpm}
              disabled={!detectedBpm}
              className="flex-1 px-4 py-2 bg-neon-cyan border border-neon-cyan text-black rounded font-rajdhani hover:bg-neon-cyan/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              APPLY
            </button>
          </div>
        </div>
      </m.div>
    </m.div>
  );
}
