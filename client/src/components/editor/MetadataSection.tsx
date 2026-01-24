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
}

export function MetadataSection({ metadata, updateMetadata }: MetadataSectionProps) {
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
            value={metadata.duration}
            onChange={(e) => updateMetadata({ duration: parseFloat(e.target.value) || 0 })}
            className="w-full bg-black border border-neon-cyan/30 text-white px-2 py-1 text-sm font-rajdhani rounded"
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
          <label className="text-xs text-gray-400 font-rajdhani">END (ms)</label>
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
