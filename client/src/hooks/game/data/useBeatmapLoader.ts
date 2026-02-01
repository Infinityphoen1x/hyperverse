// src/hooks/useBeatmapLoader.ts
import { useState } from 'react';
import { parseBeatmap, BeatmapData } from "@/lib/beatmap/beatmapParser";
import { convertBeatmapNotes } from "@/lib/beatmap/beatmapConverter";
import { extractYouTubeId } from '@/lib/youtube';
import { GameErrors } from '@/lib/errors/errorLog';
import { validateBeatmap } from '@/lib/parsers/beatmapValidation';
import { useBeatmapStore } from '@/stores/useBeatmapStore';

interface UseBeatmapLoaderProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  onBeatmapLoad: (data: BeatmapData, beatmapText: string) => void;
}

interface UseBeatmapLoaderReturn {
  beatmapText: string;
  error: string;
  isBeatmapLoaded: boolean;
  handleBeatmapTextChange: (text: string) => void;
  handleLoadBeatmap: () => void;
  handleQuickLoadEscapingGravity: () => Promise<void>;
}

const defaultBeatmap = `[METADATA]
title: Song Title
artist: Artist Name
bpm: 120
duration: 180
youtube: https://www.youtube.com/watch?v=VIDEO_ID
beatmapStart: 0
beatmapEnd: 180

[MEDIUM]
500|0|TAP
1000|1|TAP
1500|2|HOLD|1000
3000|3|TAP`;

export const useBeatmapLoader = ({ difficulty, onBeatmapLoad }: UseBeatmapLoaderProps): UseBeatmapLoaderReturn => {
  const initialBeatmapText = (() => {
    const { beatmapText } = useBeatmapStore.getState();
    if (beatmapText && beatmapText.trim()) {
      return beatmapText;
    }
    return defaultBeatmap;
  })();

  const [beatmapText, setBeatmapText] = useState(initialBeatmapText);
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

      const beatmapStartOffset = parsed.metadata?.beatmapStart || 0;
      const convertedNotes = convertBeatmapNotes(parsed.notes, beatmapStartOffset);
      if (convertedNotes.length === 0) {
        const msg = "Beatmap has no notes after conversion";
        setError(msg);
        GameErrors.log(`BeatmapLoader: ${msg}`);
        return;
      }

      // Validate HOLD note pairings
      const validation = validateBeatmap(convertedNotes as any[]);
      if (!validation.valid) {
        const errorMessages = validation.errors
          .filter(e => e.type === 'error')
          .map(e => e.message)
          .join('; ');
        const msg = `Beatmap validation failed: ${errorMessages}`;
        setError(msg);
        GameErrors.log(`BeatmapLoader: ${msg}`);
        // Log individual errors for debugging
        validation.errors.forEach(e => {
          GameErrors.log(`  - ${e.message} at ${e.timestamp}ms`);
        });
        return;
      }
      
      // Log warnings (non-blocking)
      const warnings = validation.errors.filter(e => e.type === 'warning');
      if (warnings.length > 0) {
        warnings.forEach(w => {
          GameErrors.log(`[WARNING] ${w.message} at ${w.timestamp}ms`);
        });
      }

      setIsBeatmapLoaded(true);
      
      // Notify parent with the processed data AND raw beatmapText for re-parsing with different difficulties
      onBeatmapLoad({
        ...parsed,
        notes: convertedNotes as any[], // Convert strictly typed notes back to array for storage if needed, or adjust types
        youtubeVideoId
      }, beatmapText);
      
      setBeatmapText("");
      
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