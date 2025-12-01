export function FailureBreakdownSection({ hitStats }: any) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Failure Breakdown</h3>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Miss Failures: {hitStats?.tapMissFailures || 0}</div>
        <div>Too Early: {hitStats?.tooEarlyFailures || 0}</div>
        <div>Hold Miss: {hitStats?.holdMissFailures || 0}</div>
        <div>Hold Release: {hitStats?.holdReleaseFailures || 0}</div>
      </div>
    </div>
  );
}
