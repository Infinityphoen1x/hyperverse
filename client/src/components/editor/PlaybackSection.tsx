import { Play, Pause } from 'lucide-react';

interface PlaybackSectionProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onPlay?: () => void;
  onPause?: () => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  clearSelection?: () => void; // Optional - only used for timeline seeking
  metadata: {
    beatmapStart: number;
    beatmapEnd: number;
  };
  loopStart: number | null;
  loopEnd: number | null;
  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  videoDurationMs?: number;
}

export function PlaybackSection({
  isPlaying,
  setIsPlaying,
  onPlay,
  onPause,
  currentTime,
  setCurrentTime,
  clearSelection,
  metadata,
  loopStart,
  loopEnd,
  setLoopStart,
  setLoopEnd,
  videoDurationMs,
}: PlaybackSectionProps) {
  // Use video duration if available, otherwise fall back to beatmapEnd
  const maxPlaybackTime = videoDurationMs || metadata.beatmapEnd;
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => {
            const newPlayingState = !isPlaying;
            setIsPlaying(newPlayingState);
            // Trigger YouTube directly from user gesture
            if (newPlayingState && onPlay) {
              onPlay();
            } else if (!newPlayingState && onPause) {
              onPause();
            }
          }}
          className="flex-1 px-3 py-2 bg-neon-pink border border-neon-pink text-black rounded text-sm font-rajdhani hover:bg-neon-pink/80 transition-colors flex items-center justify-center gap-2"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'PAUSE' : 'PLAY'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => {
            clearSelection?.();
            setCurrentTime(Math.max(metadata.beatmapStart, currentTime - 1000));
          }}
          className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors"
        >
          ←1s
        </button>
        <button
          onClick={() => {
            clearSelection?.();
            setCurrentTime(Math.min(maxPlaybackTime, currentTime + 1000));
          }}
          className="flex-1 px-3 py-2 bg-transparent border border-neon-cyan/30 text-neon-cyan rounded text-sm font-rajdhani hover:bg-neon-cyan/10 transition-colors"
        >
          1s→
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-400 font-rajdhani mb-1 block">SEEK TIME (ms)</label>
        <input
          type="range"
          min={metadata.beatmapStart}
          max={maxPlaybackTime}
          value={currentTime}
          onChange={(e) => {
            clearSelection?.();
            setCurrentTime(parseFloat(e.target.value));
          }}
          className="w-full"
        />
        <div className="text-xs text-neon-cyan font-mono text-center mt-1">
          {currentTime.toFixed(0)}ms / {maxPlaybackTime.toFixed(0)}ms
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 font-rajdhani mb-1 block">LOOP SECTION</label>
        <div className="flex gap-2">
          <button
            onClick={() => setLoopStart(currentTime)}
            className="flex-1 px-2 py-1 bg-transparent border border-neon-cyan/30 text-xs text-neon-cyan rounded font-rajdhani hover:bg-neon-cyan/10 transition-colors"
          >
            SET START
          </button>
          <button
            onClick={() => setLoopEnd(currentTime)}
            className="flex-1 px-2 py-1 bg-transparent border border-neon-cyan/30 text-xs text-neon-cyan rounded font-rajdhani hover:bg-neon-cyan/10 transition-colors"
          >
            SET END
          </button>
          <button
            onClick={() => { setLoopStart(null); setLoopEnd(null); }}
            className="flex-1 px-2 py-1 bg-transparent border border-red-500/30 text-xs text-red-500 rounded font-rajdhani hover:bg-red-500/10 transition-colors"
          >
            CLEAR
          </button>
        </div>
        {loopStart !== null && loopEnd !== null && (
          <div className="text-xs text-neon-cyan/70 font-mono text-center mt-1">
            {loopStart}ms → {loopEnd}ms
          </div>
        )}
      </div>
    </div>
  );
}
