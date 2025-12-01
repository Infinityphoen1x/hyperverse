export function NoteStatsSection({ stats }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Note Statistics</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Total: {stats?.total || 0}</div>
        <div>Tap: {stats?.tap || 0}</div>
        <div>Hold: {stats?.hold || 0}</div>
        <div>Hit: {stats?.hit || 0}</div>
        <div>Missed: {stats?.missed || 0}</div>
        <div>Failed: {stats?.failed || 0}</div>
      </div>
    </div>
  );
}
