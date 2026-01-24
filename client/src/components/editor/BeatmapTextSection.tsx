interface BeatmapTextSectionProps {
  beatmapText: string;
  setBeatmapText: (text: string) => void;
  updateFromText: (text: string) => void;
}

export function BeatmapTextSection({
  beatmapText,
  setBeatmapText,
  updateFromText,
}: BeatmapTextSectionProps) {
  return (
    <textarea
      value={beatmapText}
      onChange={(e) => {
        setBeatmapText(e.target.value);
        updateFromText(e.target.value);
      }}
      className="w-full h-64 bg-black border border-neon-cyan/30 text-white px-3 py-2 text-xs font-mono rounded resize-y"
      placeholder="Beatmap text will appear here..."
    />
  );
}
