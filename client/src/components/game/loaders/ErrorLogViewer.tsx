// src/components/ErrorLogViewer.tsx
import React, { useState } from 'react';
import { m, AnimatePresence } from "@/lib/motion/MotionProvider";
import { ChevronDown } from 'lucide-react';
import { useErrorLogs } from '@/hooks/utils/useErrorLogs';
import { NoteStatsSection } from './NoteStatsSection';
import { RenderAndHitStatsSection } from './RenderAndHitStatsSection';
import { FailureBreakdownSection } from './FailureBreakdownSection';
import { AnimationStatsSection } from './AnimationStatsSection';
import { ErrorCountsSection } from './ErrorCountsSection';
import { ErrorListSection } from './ErrorListSection';

export function ErrorLogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    errors,
    animations,
    noteCounts: errorCounts,
    noteStats,
    renderStats,
    hitStats,
    animationStats,
    downloadUnifiedLogs,
    clearLogs,
  } = useErrorLogs();

  return (
    <m.div
      className="fixed bottom-4 right-4 z-50 pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Toggle Button */}
      <m.button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-900 border border-cyan-500 text-cyan-400 px-3 py-2 rounded text-sm font-mono flex items-center gap-2 hover:bg-gray-800 transition"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-toggle-error-log"
      >
        <span>Logs</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </m.button>
      {/* Log Panel */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 right-0 bg-gray-950 border border-cyan-500 rounded-lg w-96 h-96 flex flex-col shadow-2xl"
            data-testid="panel-error-log-viewer"
          >
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
              <NoteStatsSection noteStats={noteStats} />
              <RenderAndHitStatsSection renderStats={renderStats} hitStats={hitStats} />
              <FailureBreakdownSection hitStats={hitStats} />
              <AnimationStatsSection animationStats={animationStats} animations={animations} />
              <ErrorCountsSection errorCounts={errorCounts} />
              <ErrorListSection errors={errors} />
            </div>
            {/* Controls - Fixed at bottom */}
            <div className="border-t border-cyan-500/30 p-4 bg-gray-950 space-y-2 flex-shrink-0">
              <div className="flex gap-2 text-xs">
                <button
                  onClick={downloadUnifiedLogs}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded transition"
                  data-testid="button-download-logs"
                  title="Download unified diagnostic logs (JSON)"
                >
                  Download All Logs
                </button>
                <button
                  onClick={clearLogs}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition"
                  data-testid="button-clear-logs"
                >
                  Clear
                </button>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
