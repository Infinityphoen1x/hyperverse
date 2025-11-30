interface ErrorIndicatorProps {
  count: number;
}

export function ErrorIndicator({ count }: ErrorIndicatorProps) {
  return count > 0 ? (
    <div className="text-xs text-neon-yellow font-rajdhani">
      {count} error(s)
    </div>
  ) : null;
}