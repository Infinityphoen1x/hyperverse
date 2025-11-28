import { useState, useEffect } from 'react';
import { GameErrors } from '@/lib/gameEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export function ErrorLogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [animationStats, setAnimationStats] = useState({ total: 0, completed: 0, failed: 0, pending: 0, rendering: 0 });
  const [animations, setAnimations] = useState<any[]>([]);
  const [errorCounts, setErrorCounts] = useState({ beatmapLoader: 0, parser: 0, converter: 0, meter: 0, trapezoid: 0, game: 0 });
  const [noteStats, setNoteStats] = useState({ total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} as Record<number, number> });
  const [renderStats, setRenderStats] = useState({ rendered: 0, preMissed: 0 });
  const [hitStats, setHitStats] = useState({ successfulHits: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 });

  // Update logs in real-time
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setErrors([...GameErrors.notes]);
      setAnimationStats(GameErrors.getAnimationStats());
      setAnimations([...GameErrors.animations]);
      setNoteStats({ ...GameErrors.noteStats });
      setRenderStats({ ...GameErrors.renderStats });
      setHitStats({ ...GameErrors.hitStats });
      
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
    GameErrors.renderStats = { rendered: 0, preMissed: 0 };
    GameErrors.hitStats = { successfulHits: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 };
    setErrors([]);
    setAnimations([]);
    setRenderStats({ rendered: 0, preMissed: 0 });
    setHitStats({ successfulHits: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 });
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
            {/* Loaded Notes Stats */}
            {noteStats.total > 0 && (
              <div className="bg-gray-900 rounded p-2 text-xs text-purple-300 font-mono space-y-2">
                <div className="font-bold text-purple-400 mb-1">BEATMAP LOADED</div>
                <div className="grid grid-cols-3 gap-1">
                  <div className="bg-gray-800 p-1 rounded">
                    <div className="text-gray-500 text-xs">Total</div>
                    <div className="text-lg font-bold">{noteStats.total}</div>
                  </div>
                  <div className="bg-gray-800 p-1 rounded">
                    <div className="text-gray-500 text-xs">TAP</div>
                    <div className="text-lg font-bold text-blue-300">{noteStats.tap}</div>
                  </div>
                  <div className="bg-gray-800 p-1 rounded">
                    <div className="text-gray-500 text-xs">HOLD</div>
                    <div className="text-lg font-bold text-pink-300">{noteStats.hold}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-700">
                  <div className="bg-gray-800 p-1 rounded">
                    <div className="text-gray-500 text-xs">✓ Hit</div>
                    <div className="text-lg font-bold text-green-300">{noteStats.hit}</div>
                  </div>
                  <div className="bg-gray-800 p-1 rounded">
                    <div className="text-gray-500 text-xs">✗ Failed</div>
                    <div className="text-lg font-bold text-red-300">{noteStats.failed}</div>
                  </div>
                  <div className="bg-gray-800 p-1 rounded">
                    <div className="text-gray-500 text-xs">Pending</div>
                    <div className="text-lg font-bold text-yellow-300">{noteStats.total - noteStats.hit - noteStats.failed - noteStats.missed}</div>
                  </div>
                </div>
                {Object.keys(noteStats.byLane).length > 0 && (
                  <div className="text-xs text-gray-400 pt-1 border-t border-gray-700">
                    <div className="font-mono">Lanes: {Object.entries(noteStats.byLane).map(([lane, count]) => {
                      const laneNames: Record<string, string> = { '0': 'W', '1': 'O', '2': 'I', '3': 'E', '-1': 'Q', '-2': 'P' };
                      return `${laneNames[lane] || lane}=${count}`;
                    }).join(' ')}</div>
                  </div>
                )}
              </div>
            )}

            {/* Render & Hit Tracking */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-900 rounded p-2 text-xs text-green-300 font-mono space-y-1">
                <div className="font-bold text-green-400">RENDER TRACKING</div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-gray-500">Rendered</div>
                  <div className="text-lg font-bold">{renderStats.rendered}</div>
                </div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-gray-500">Pre-Missed</div>
                  <div className="text-lg font-bold text-yellow-300">{renderStats.preMissed}</div>
                </div>
              </div>

              <div className="bg-gray-900 rounded p-2 text-xs text-blue-300 font-mono space-y-1">
                <div className="font-bold text-blue-400">HIT RESULTS</div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-green-400">✓ Successful</div>
                  <div className="text-lg font-bold text-green-300">{hitStats.successfulHits}</div>
                </div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-red-400">✗ Failed</div>
                  <div className="text-lg font-bold text-red-300">{hitStats.tapMissFailures + hitStats.tooEarlyFailures + hitStats.holdMissFailures + hitStats.holdReleaseFailures}</div>
                </div>
              </div>
            </div>

            {/* Failure Breakdown */}
            {(hitStats.tapMissFailures > 0 || hitStats.tooEarlyFailures > 0 || hitStats.holdMissFailures > 0 || hitStats.holdReleaseFailures > 0) && (
              <div className="bg-gray-900 rounded p-2 text-xs text-red-300 font-mono space-y-1">
                <div className="font-bold text-red-400 mb-1">FAILURE BREAKDOWN</div>
                <div className="grid grid-cols-2 gap-1">
                  {hitStats.tapMissFailures > 0 && <div><span className="text-gray-500">TAP Miss</span>: {hitStats.tapMissFailures}</div>}
                  {hitStats.tooEarlyFailures > 0 && <div><span className="text-gray-500">Too Early</span>: {hitStats.tooEarlyFailures}</div>}
                  {hitStats.holdMissFailures > 0 && <div><span className="text-gray-500">Hold Miss</span>: {hitStats.holdMissFailures}</div>}
                  {hitStats.holdReleaseFailures > 0 && <div><span className="text-gray-500">Release Fail</span>: {hitStats.holdReleaseFailures}</div>}
                </div>
              </div>
            )}

            {/* Animation Stats */}
            <div className="bg-gray-900 rounded p-2 text-xs text-cyan-300 font-mono space-y-2">
              <div className="font-bold text-cyan-400 mb-1">ANIMATION LIFECYCLE</div>
              <div className="grid grid-cols-4 gap-1">
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-gray-400 text-xs">Total</div>
                  <div className="text-lg font-bold">{animationStats.total}</div>
                </div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-yellow-400 text-xs">Pending</div>
                  <div className="text-lg font-bold text-yellow-300">{animationStats.pending}</div>
                </div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-blue-400 text-xs">Rendering</div>
                  <div className="text-lg font-bold text-blue-300">{animationStats.rendering}</div>
                </div>
                <div className="bg-gray-800 p-1 rounded">
                  <div className="text-green-400 text-xs">✓ Completed</div>
                  <div className="text-lg font-bold text-green-300">{animationStats.completed}</div>
                </div>
              </div>
              {animationStats.failed > 0 && (
                <div className="bg-red-900/30 border border-red-600 p-1 rounded">
                  <div className="text-red-400 text-xs">✗ Animation Errors</div>
                  <div className="text-lg font-bold text-red-300">{animationStats.failed}</div>
                </div>
              )}
              <div className="text-xs text-gray-500 italic pt-1 border-t border-gray-700">
                Lifecycle: pending → rendering → completed
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
