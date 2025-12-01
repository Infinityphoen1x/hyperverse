export function RenderAndHitStatsSection({ renderStats, hitStats }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Render & Hit Statistics</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Rendered: {renderStats?.rendered || 0}</div>
        <div>Pre-Missed: {renderStats?.preMissed || 0}</div>
        <div>Successful Hits: {hitStats?.successfulHits || 0}</div>
        <div>Too Early: {hitStats?.tapTooEarlyFailures || 0}</div>
      </div>
    </div>
  );
}
