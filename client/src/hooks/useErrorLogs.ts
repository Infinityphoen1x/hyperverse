// src/hooks/useErrorLogs.ts
import { useGameDebuggerStore } from '@/stores/useGameDebuggerStore';
import { countErrorsByCategory, resetHitStats, resetRenderStats } from '@/lib/utils/errorLogUtils';

export const useErrorLogs = () => {
  const state = useGameDebuggerStore();
  
  // Derived stats
  const errorCounts = countErrorsByCategory(state.notes);
  
  const getAnimationStats = () => {
    const total = state.animations.length;
    const completed = state.animations.filter(a => a.completed).length;
    const failed = 0; // Not currently tracked in AnimationTrackingEntry
    const pending = total - completed;
    const rendering = pending; // Simplified mapping

    return {
      total,
      completed,
      failed,
      pending,
      rendering
    };
  };

  const animationStats = getAnimationStats();

  const downloadUnifiedLogs = () => {
    const consoleLogs = (window as any).__consoleLogs || [];

    const logData = {
      timestamp: new Date().toISOString(),
      gameErrors: {
        errors: state.notes,
        animations: state.animations,
        stats: {
          notes: state.noteStats,
          render: state.renderStats,
          hits: state.hitStats,
          animation: animationStats,
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
    state.reset();
  };

  return {
    errors: state.notes,
    animations: state.animations,
    noteCounts: errorCounts,
    noteStats: state.noteStats,
    renderStats: state.renderStats,
    hitStats: state.hitStats,
    animationStats,
    downloadUnifiedLogs,
    clearLogs,
  };
};
