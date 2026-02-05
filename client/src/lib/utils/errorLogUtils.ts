// src/utils/errorLogUtils.ts
// Pure functions for error/logic derivation - no state, testable
export const countErrorsByCategory = (notes: (string | any)[]) => {
  const counts = {
    beatmapLoader: 0,
    parser: 0,
    converter: 0,
    meter: 0,
    trapezoid: 0,
    game: 0,
  };
  notes.forEach(entry => {
    const err = typeof entry === 'string' ? entry : entry.message || '';
    if (err.includes('BeatmapLoader')) counts.beatmapLoader++;
    else if (err.includes('BeatmapParser')) counts.parser++;
    else if (err.includes('BeatmapConverter')) counts.converter++;
    else if (err.includes('DeckMeter')) counts.meter++;
    else if (err.includes('Trapezoid')) counts.trapezoid++;
    else counts.game++;
  });
  return counts;
};

export const getLaneNames = (): Record<string, string> => ({ // Returns position names for display
  '0': 'W',
  '1': 'O',
  '2': 'I',
  '3': 'E',
  '-1': 'Q',
  '-2': 'P',
});

export const formatLaneStats = (byLane: Record<number, number>): string => { // Parameter byLane contains position values
  const laneNames = getLaneNames();
  return Object.entries(byLane)
    .map(([lane, count]) => `${laneNames[lane] || lane}=${count}`) // 'lane' represents position value
    .join(' ');
};

// Resets - can be called in store actions
export const resetHitStats = () => ({
  successfulHits: 0,
  tapTooEarlyFailures: 0,
  tapMissFailures: 0,
  tooEarlyFailures: 0,
  holdMissFailures: 0,
  holdReleaseFailures: 0,
});

export const resetRenderStats = () => ({
  rendered: 0,
  preMissed: 0,
});