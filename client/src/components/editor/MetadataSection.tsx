interface MetadataSectionProps {
  metadata: {
    title: string;
    artist: string;
    bpm: number;
    duration: number;
    youtubeUrl: string;
    beatmapStart: number;
    beatmapEnd: number;
  };
  updateMetadata: (updates: Partial<MetadataSectionProps['metadata']>) => void;
  videoDurationMs?: number;
}

export function MetadataSection({ metadata, updateMetadata, videoDurationMs }: MetadataSectionProps) {
  const handleAutoFillEnd = () => {
    if (videoDurationMs && videoDurationMs > 0) {
      updateMetadata({ beatmapEnd: videoDurationMs });
    }
  };
  
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-400 font-rajdhani">TITLE</label>
        <input
          type="text"
          value={metadata.title}
          onChange={(e) => updateMetadata({ title: e.target.value })}
          className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 font-rajdhani">ARTIST</label>
        <input
          type="text"
          value={metadata.artist}
          onChange={(e) => updateMetadata({ artist: e.target.value })}
          className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 font-rajdhani">BPM</label>
          <input
            type="number"
            value={metadata.bpm}
            onChange={(e) => updateMetadata({ bpm: parseFloat(e.target.value) || 120 })}
            className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-rajdhani">DURATION (s)</label>
          <input
            type="number"
            value={videoDurationMs ? Math.floor(videoDurationMs / 1000) : metadata.duration}
            readOnly
            className="w-full bg-black border border-neon-cyan/30 text-white/60 px-2 py-1 text-sm font-rajdhani rounded cursor-not-allowed"
            title="Auto-populated from YouTube video"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 font-rajdhani">YOUTUBE URL</label>
        <input
          type="text"
          value={metadata.youtubeUrl}
          onChange={(e) => updateMetadata({ youtubeUrl: e.target.value })}
          className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 font-rajdhani">START (ms)</label>
          <input
            type="number"
            value={metadata.beatmapStart}
            onChange={(e) => updateMetadata({ beatmapStart: parseFloat(e.target.value) || 0 })}
            className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 font-rajdhani flex items-center justify-between">
            <span>END (ms)</span>
            {videoDurationMs && videoDurationMs > 0 && (
              <button
                type="button"
                onClick={handleAutoFillEnd}
                className="text-[10px] px-1.5 py-0.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded transition-colors"
                title="Auto-fill from video duration"
              >
                AUTO-FILL
              </button>
            )}
          </label>
          <input
            type="number"
            value={metadata.beatmapEnd}
            onChange={(e) => updateMetadata({ beatmapEnd: parseFloat(e.target.value) || 0 })}
            className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
          />
        </div>
      </div>
    </div>
  );
}
