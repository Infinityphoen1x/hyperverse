// src/hooks/useBeatmapLoader.ts
import { useState } from 'react';
import { parseBeatmap, BeatmapData } from "@/lib/beatmap/beatmapParser";
import { convertBeatmapNotes } from "@/lib/beatmap/beatmapConverter";
import { extractYouTubeId } from '@/lib/youtube';
import { GameErrors } from '@/lib/errors/errorLog';

interface UseBeatmapLoaderProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  onBeatmapLoad: (data: BeatmapData) => void;
}

interface UseBeatmapLoaderReturn {
  beatmapText: string;
  error: string;
  isBeatmapLoaded: boolean;
  handleBeatmapTextChange: (text: string) => void;
  handleLoadBeatmap: () => void;
  handleQuickLoadEscapingGravity: () => Promise<void>;
}

const defaultBeatmap = `{
  "metadata": {
    "title": "",
    "artist": "",
    "bpm": 120,
    "duration": 0,
    "youtube": ""
  },
  "notes": []
}`;

export const useBeatmapLoader = ({ difficulty, onBeatmapLoad }: UseBeatmapLoaderProps): UseBeatmapLoaderReturn => {
  const [beatmapText, setBeatmapText] = useState(defaultBeatmap);
  const [error, setError] = useState("");
  const [isBeatmapLoaded, setIsBeatmapLoaded] = useState(false);

  const handleBeatmapTextChange = (text: string) => {
    setBeatmapText(text);
    setError("");
  };

  const handleLoadBeatmap = () => {
    setError("");
    if (!beatmapText.trim()) {
      const msg = "Please paste a beatmap";
      setError(msg);
      GameErrors.log(`BeatmapLoader: ${msg}`);
      return;
    }

    try {
      const parsed = parseBeatmap(beatmapText, difficulty);
      
      if (parsed.error) {
        const msg = parsed.error;
        setError(msg);
        GameErrors.log(`BeatmapLoader: ${msg}`);
        return;
      }

      let youtubeVideoId: string | undefined;
      if (parsed.metadata.youtube) {
        const extractedId = extractYouTubeId(parsed.metadata.youtube);
        if (!extractedId) {
          const msg = "Invalid YouTube URL in beatmap metadata";
          setError(msg);
          GameErrors.log(`BeatmapLoader: ${msg}`);
          return;
        }
        youtubeVideoId = extractedId;
      }

      const convertedNotes = convertBeatmapNotes(parsed.notes);
      if (convertedNotes.length === 0) {
        const msg = "Beatmap has no notes after conversion";
        setError(msg);
        GameErrors.log(`BeatmapLoader: ${msg}`);
        return;
      }

      setIsBeatmapLoaded(true);
      setBeatmapText("");
      
      // Notify parent with the processed data
      onBeatmapLoad({
        ...parsed,
        notes: convertedNotes as any[], // Convert strictly typed notes back to array for storage if needed, or adjust types
        youtubeVideoId
      });
      
    } catch (error) {
      const msg = `Beatmap loading error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(msg);
      GameErrors.log(`BeatmapLoader: ${msg}`);
    }
  };

  const handleQuickLoadEscapingGravity = async () => {
    setError("");
    try {
      const response = await fetch("/escaping-gravity.txt");
      if (!response.ok) throw new Error("Failed to load beatmap file");
      const content = await response.text();
      setBeatmapText(content);
    } catch (error) {
      const msg = `Failed to load escaping-gravity.txt: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(msg);
      GameErrors.log(`BeatmapLoader: ${msg}`);
    }
  };

  return {
    beatmapText,
    error,
    isBeatmapLoaded,
    handleBeatmapTextChange,
    handleLoadBeatmap,
    handleQuickLoadEscapingGravity,
  };
};