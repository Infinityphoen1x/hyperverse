import { useState, useEffect } from 'react';
import { GameErrors } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export function ErrorLogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [animationStats, setAnimationStats] = useState({ total: 0, completed: 0, failed: 0, pending: 0 });
  const [animations, setAnimations] = useState<any[]>([]);
  const [errorCounts, setErrorCounts] = useState({ beatmapLoader: 0, parser: 0, converter: 0, meter: 0, trapezoid: 0, game: 0 });

  // Update logs in real-time
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setErrors([...GameErrors.notes]);
      setAnimationStats(GameErrors.getAnimationStats());
      setAnimations([...GameErrors.animations]);
      
      // Count errors by category
      const counts = {
        beatmapLoader: 0,
        parser: 0,
        converter: 0,
        meter: 0,
        trapezoid: 0,
        game: 0,
      };
      
      GameErrors.notes.forEach(err => {
        if (err.includes('BeatmapLoader')) counts.beatmapLoader++;
        else if (err.includes('BeatmapParser')) counts.parser++;
        else if (err.includes('BeatmapConverter')) counts.converter++;
        else if (err.includes('DeckMeter')) counts.meter++;
        else if (err.includes('Trapezoid')) counts.trapezoid++;
        else counts.game++;
      });
      
      setErrorCounts(counts);
    }, 500);

    return () => clearInterval(updateInterval);
  }, []);

  const downloadLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      errorLog: GameErrors.notes,
      animationStats: GameErrors.getAnimationStats(),
      animationDetails: GameErrors.animations,
    };

    const jsonStr = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `game-errors-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    GameErrors.notes = [];
    GameErrors.animations = [];
    setErrors([]);
    setAnimations([]);
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50 pointer-events-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Toggle Button */}
      <motion.button
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
      </motion.button>

      {/* Log Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 right-0 bg-gray-950 border border-cyan-500 rounded-lg p-4 w-96 max-h-96 flex flex-col gap-3 shadow-2xl"
            data-testid="panel-error-log-viewer"
          >
            {/* Animation Stats */}
            <div className="bg-gray-900 rounded p-2 text-xs text-cyan-300 font-mono grid grid-cols-4 gap-1">
              <div>
                <div className="text-gray-500">Total</div>
                <div className="text-lg font-bold">{animationStats.total}</div>
              </div>
              <div>
                <div className="text-gray-500">✓ Done</div>
                <div className="text-lg font-bold text-green-400">{animationStats.completed}</div>
              </div>
              <div>
                <div className="text-gray-500">✗ Failed</div>
                <div className="text-lg font-bold text-red-400">{animationStats.failed}</div>
              </div>
              <div>
                <div className="text-gray-500">⏳ Pending</div>
                <div className="text-lg font-bold text-yellow-400">{animationStats.pending}</div>
              </div>
            </div>

            {/* Error Category Breakdown */}
            {Object.values(errorCounts).some(v => v > 0) && (
              <div className="bg-gray-900 rounded p-2 text-xs text-yellow-300 font-mono grid grid-cols-3 gap-1">
                {errorCounts.beatmapLoader > 0 && (
                  <div><span className="text-gray-500">Loader</span>: <span className="font-bold">{errorCounts.beatmapLoader}</span></div>
                )}
                {errorCounts.parser > 0 && (
                  <div><span className="text-gray-500">Parser</span>: <span className="font-bold">{errorCounts.parser}</span></div>
                )}
                {errorCounts.converter > 0 && (
                  <div><span className="text-gray-500">Convert</span>: <span className="font-bold">{errorCounts.converter}</span></div>
                )}
                {errorCounts.meter > 0 && (
                  <div><span className="text-gray-500">Meter</span>: <span className="font-bold">{errorCounts.meter}</span></div>
                )}
                {errorCounts.trapezoid > 0 && (
                  <div><span className="text-gray-500">Trap</span>: <span className="font-bold">{errorCounts.trapezoid}</span></div>
                )}
                {errorCounts.game > 0 && (
                  <div><span className="text-gray-500">Game</span>: <span className="font-bold">{errorCounts.game}</span></div>
                )}
              </div>
            )}

            {/* Error Messages */}
            <div
              className="overflow-y-auto max-h-48 bg-gray-900 rounded p-2 text-xs text-red-300 font-mono space-y-1"
              data-testid="list-error-messages"
            >
              {errors.length === 0 ? (
                <div className="text-gray-500">No errors</div>
              ) : (
                errors.map((error, idx) => (
                  <div key={idx} className="truncate hover:text-red-200">
                    {error}
                  </div>
                ))
              )}
            </div>

            {/* Animation Details (collapsed by default) */}
            {animations.length > 0 && (
              <details className="bg-gray-900 rounded p-2 text-xs text-yellow-300 font-mono">
                <summary className="cursor-pointer hover:text-yellow-200">
                  {animations.length} Animation Events
                </summary>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {animations.map((anim, idx) => (
                    <div key={idx} className="text-gray-400 truncate">
                      [{anim.type}] {anim.noteId.substring(0, 12)}... = {anim.status}
                      {anim.errorMsg && ` - ${anim.errorMsg}`}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Controls */}
            <div className="flex gap-2 text-xs">
              <button
                onClick={downloadLogs}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded transition"
                data-testid="button-download-logs"
              >
                Download
              </button>
              <button
                onClick={clearLogs}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition"
                data-testid="button-clear-logs"
              >
                Clear
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Updated: {new Date().toLocaleTimeString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
