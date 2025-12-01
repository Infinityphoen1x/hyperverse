// src/hooks/useBeatmapLoader.ts
import { useState } from 'react';
import { parseBeatmap } from "@/lib/beatmap/beatmapParser";
import { convertBeatmapNotes } from "@/lib/beatmap/beatmapConverter";
import { extractYouTubeId } from '@/lib/youtube';
import { Note } from '@/lib/engine/gameTypes';
import { GameErrors } from '@/lib/errors/errorLog';
import { useGameStore } from '@/stores/useGameStore'; // For dispatching load + loaded state
interface UseBeatmapLoaderProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}
interface UseBeatmapLoaderReturn {
  beatmapText: string;
  error: string;
  setIsOpen: (open: boolean) => void; // For dialog control
  handleBeatmapTextChange: (text: string) => void;
  handleLoadBeatmap: () => void;
  handleQuickLoadEscapingGravity: () => Promise<void>;
}
const defaultBeatmap = `[METADATA]
title:
artist:
bpm: 120
duration: 0
youtube:
[${'EASY'}]`; // Placeholder; will be overridden by prop
export const useBeatmapLoader = ({ difficulty }: UseBeatmapLoaderProps): UseBeatmapLoaderReturn => {
  const [beatmapText, setBeatmapText] = useState(defaultBeatmap.replace('[EASY]', `[${difficulty}]`));
  const [error, setError] = useState("");
  const { loadBeatmap, isBeatmapLoaded, setBeatmapLoaded } = useGameStore(); // Dispatch + loaded state
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
      if (!parsed) {
        const msg = `Failed to parse beatmap for ${difficulty} difficulty`;
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
      loadBeatmap(youtubeVideoId, convertedNotes); // Dispatch to store
      setBeatmapLoaded(true); // Update global loaded state
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
  // Note: isOpen is managed by parent dialog for simplicity; expose setter if needed
  const setIsOpen = () => {}; // Placeholder; parent handles via prop if passed
  return {
    beatmapText,
    error,
    setIsOpen,
    handleBeatmapTextChange,
    handleLoadBeatmap,
    handleQuickLoadEscapingGravity,
  };
};