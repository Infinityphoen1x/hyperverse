// Helper components to reduce ErrorLogViewer.tsx complexity

export interface StatBoxProps {
  label: string;
  value: number | string;
  color?: 'gray' | 'green' | 'red' | 'blue' | 'yellow' | 'purple' | 'cyan' | 'pink';
}

export function StatBox({ label, value, color = 'gray' }: StatBoxProps) {
  const colorMap = {
    gray: 'text-gray-500',
    green: 'text-green-300',
    red: 'text-red-300',
    blue: 'text-blue-300',
    yellow: 'text-yellow-300',
    purple: 'text-purple-300',
    cyan: 'text-cyan-300',
    pink: 'text-pink-300',
  };

  return (
    <div className="bg-gray-800 p-1 rounded">
      <div className={`text-gray-500 text-xs`}>{label}</div>
      <div className={`text-lg font-bold ${colorMap[color]}`}>{value}</div>
    </div>
  );
}

export interface StatGridProps {
  children: React.ReactNode;
  cols?: number;
}

export function StatGrid({ children, cols = 3 }: StatGridProps) {
  return (
    <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  );
}

export interface StatSectionProps {
  title: string;
  titleColor?: 'purple' | 'green' | 'blue' | 'cyan' | 'red' | 'yellow';
  textColor?: 'purple' | 'green' | 'blue' | 'cyan' | 'red' | 'yellow';
  children: React.ReactNode;
  divider?: boolean;
}

export function StatSection({ title, titleColor = 'purple', textColor = 'purple', children, divider = false }: StatSectionProps) {
  const colorMap = {
    purple: { title: 'text-purple-400', text: 'text-purple-300' },
    green: { title: 'text-green-400', text: 'text-green-300' },
    blue: { title: 'text-blue-400', text: 'text-blue-300' },
    cyan: { title: 'text-cyan-400', text: 'text-cyan-300' },
    red: { title: 'text-red-400', text: 'text-red-300' },
    yellow: { title: 'text-yellow-400', text: 'text-yellow-300' },
  };

  return (
    <div className={`bg-gray-900 rounded p-2 text-xs ${colorMap[textColor].text} font-mono space-y-2${divider ? ' border-t border-gray-700 pt-2' : ''}`}>
      <div className={`font-bold ${colorMap[titleColor].title} mb-1`}>{title}</div>
      {children}
    </div>
  );
}

// Helper functions
export const countErrorsByCategory = (notes: string[]) => {
  const counts = {
    beatmapLoader: 0,
    parser: 0,
    converter: 0,
    meter: 0,
    trapezoid: 0,
    game: 0,
  };

  notes.forEach(err => {
    if (err.includes('BeatmapLoader')) counts.beatmapLoader++;
    else if (err.includes('BeatmapParser')) counts.parser++;
    else if (err.includes('BeatmapConverter')) counts.converter++;
    else if (err.includes('DeckMeter')) counts.meter++;
    else if (err.includes('Trapezoid')) counts.trapezoid++;
    else counts.game++;
  });

  return counts;
};

export const getLaneNames = (): Record<string, string> => ({
  '0': 'W',
  '1': 'O',
  '2': 'I',
  '3': 'E',
  '-1': 'Q',
  '-2': 'P',
});

export const formatLaneStats = (byLane: Record<number, number>): string => {
  const laneNames = getLaneNames();
  return Object.entries(byLane)
    .map(([lane, count]) => `${laneNames[lane] || lane}=${count}`)
    .join(' ');
};

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
