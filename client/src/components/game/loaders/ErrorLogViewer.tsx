import { useState, useEffect } from 'react';
import { GameErrors } from '@/lib/errors/errorLog';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { StatBox, StatGrid, StatSection, countErrorsByCategory, formatLaneStats, resetHitStats, resetRenderStats } from './ErrorLogViewerHelpers';

export function ErrorLogViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [animationStats, setAnimationStats] = useState({ total: 0, completed: 0, failed: 0, pending: 0, rendering: 0 });
  const [animations, setAnimations] = useState<any[]>([]);
  const [errorCounts, setErrorCounts] = useState({ beatmapLoader: 0, parser: 0, converter: 0, meter: 0, trapezoid: 0, game: 0 });
  const [noteStats, setNoteStats] = useState({ total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} as Record<number, number> });
  const [renderStats, setRenderStats] = useState({ rendered: 0, preMissed: 0 });
  const [hitStats, setHitStats] = useState({ successfulHits: 0, tapTooEarlyFailures: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 });

  // Update logs in real-time
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setErrors([...GameErrors.notes]);
      setAnimationStats(GameErrors.getAnimationStats());
      setAnimations([...GameErrors.animations]);
      setNoteStats({ ...GameErrors.noteStats });
      setRenderStats({ ...GameErrors.renderStats });
      setHitStats({ ...GameErrors.hitStats });
      setErrorCounts(countErrorsByCategory(GameErrors.notes));
    }, 500);

    return () => clearInterval(updateInterval);
  }, []);

  const downloadUnifiedLogs = () => {
    const consoleLogs = (window as any).__consoleLogs || [];
    
    // Unified JSON format
    const logData = {
      timestamp: new Date().toISOString(),
      gameErrors: {
        errors: GameErrors.notes,
        animations: GameErrors.animations,
        stats: {
          notes: GameErrors.noteStats,
          render: GameErrors.renderStats,
          hits: GameErrors.hitStats,
          animation: GameErrors.getAnimationStats(),
        },
      },
      consoleLogs: consoleLogs.map((entry: any) => ({
        t: entry.t,
        level: entry.l,
        message: entry.m,
      })),
    };

    const jsonStr = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hyperverse-logs-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    const emptyHitStats = resetHitStats();
    const emptyRenderStats = resetRenderStats();
    GameErrors.notes = [];
    GameErrors.animations = [];
    GameErrors.renderStats = emptyRenderStats;
    GameErrors.hitStats = emptyHitStats;
    setErrors([]);
    setAnimations([]);
    setRenderStats(emptyRenderStats);
    setHitStats(emptyHitStats);
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
            className="absolute bottom-12 right-0 bg-gray-950 border border-cyan-500 rounded-lg w-96 h-96 flex flex-col shadow-2xl"
            data-testid="panel-error-log-viewer"
          >
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4"
            >
            {/* Loaded Notes Stats */}
            {noteStats.total > 0 && (
              <StatSection title="BEATMAP LOADED" titleColor="purple" textColor="purple">
                <StatGrid cols={3}>
                  <StatBox label="Total" value={noteStats.total} color="gray" />
                  <StatBox label="TAP" value={noteStats.tap} color="blue" />
                  <StatBox label="HOLD" value={noteStats.hold} color="pink" />
                </StatGrid>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-700">
                  <StatBox label="✓ Hit" value={noteStats.hit} color="green" />
                  <StatBox label="✗ Failed" value={noteStats.failed} color="red" />
                  <StatBox label="Pending" value={noteStats.total - noteStats.hit - noteStats.failed - noteStats.missed} color="yellow" />
                </div>
                {Object.keys(noteStats.byLane).length > 0 && (
                  <div className="text-xs text-gray-400 pt-1 border-t border-gray-700">
                    <div className="font-mono">Lanes: {formatLaneStats(noteStats.byLane)}</div>
                  </div>
                )}
              </StatSection>
            )}

            {/* Render & Hit Tracking */}
            <div className="grid grid-cols-2 gap-2">
              <StatSection title="RENDER TRACKING" titleColor="green" textColor="green">
                <StatBox label="Rendered" value={renderStats.rendered} color="gray" />
                <StatBox label="Pre-Missed" value={renderStats.preMissed} color="yellow" />
              </StatSection>

              <StatSection title="HIT RESULTS" titleColor="blue" textColor="blue">
                <StatBox label="✓ Successful" value={hitStats.successfulHits} color="green" />
                <StatBox label="✗ Failed" value={hitStats.tapMissFailures + hitStats.tooEarlyFailures + hitStats.holdMissFailures + hitStats.holdReleaseFailures} color="red" />
              </StatSection>
            </div>

            {/* Failure Breakdown */}
            {(hitStats.tapMissFailures > 0 || hitStats.tooEarlyFailures > 0 || hitStats.holdMissFailures > 0 || hitStats.holdReleaseFailures > 0) && (
              <StatSection title="FAILURE BREAKDOWN" titleColor="red" textColor="red">
                <div className="grid grid-cols-2 gap-1">
                  {hitStats.tapMissFailures > 0 && <div><span className="text-gray-500">TAP Miss</span>: {hitStats.tapMissFailures}</div>}
                  {hitStats.tooEarlyFailures > 0 && <div><span className="text-gray-500">Too Early</span>: {hitStats.tooEarlyFailures}</div>}
                  {hitStats.holdMissFailures > 0 && <div><span className="text-gray-500">Hold Miss</span>: {hitStats.holdMissFailures}</div>}
                  {hitStats.holdReleaseFailures > 0 && <div><span className="text-gray-500">Release Fail</span>: {hitStats.holdReleaseFailures}</div>}
                </div>
              </StatSection>
            )}

            {/* Animation Stats */}
            <StatSection title="ANIMATION LIFECYCLE" titleColor="cyan" textColor="cyan">
              <StatGrid cols={4}>
                <StatBox label="Total" value={animationStats.total} color="gray" />
                <StatBox label="Pending" value={animationStats.pending} color="yellow" />
                <StatBox label="Rendering" value={animationStats.rendering} color="blue" />
                <StatBox label="✓ Completed" value={animationStats.completed} color="green" />
              </StatGrid>
              {animationStats.failed > 0 && (
                <div className="bg-red-900/30 border border-red-600 p-1 rounded">
                  <div className="text-red-400 text-xs">✗ Animation Errors</div>
                  <div className="text-lg font-bold text-red-300">{animationStats.failed}</div>
                </div>
              )}
              <div className="text-xs text-gray-500 italic pt-1 border-t border-gray-700">
                Lifecycle: pending → rendering → completed
              </div>
            </StatSection>

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
              className="bg-gray-900 rounded p-2 text-xs text-red-300 font-mono space-y-1 flex-1 overflow-y-auto"
              data-testid="list-error-messages"
            >
              {errors.length === 0 ? (
                <div className="text-gray-500">No errors</div>
              ) : (
                errors.map((error, idx) => (
                  <div key={idx} className="truncate hover:text-red-200 break-words whitespace-pre-wrap">
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
