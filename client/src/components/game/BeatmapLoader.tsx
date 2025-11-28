import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseBeatmap } from "@/lib/beatmapParser";
import { convertBeatmapNotes } from "@/lib/beatmapConverter";
import { extractYouTubeId } from "@/lib/youtubeUtils";
import { GameErrors, Note } from "@/lib/gameEngine";
import { Music } from "lucide-react";

interface BeatmapLoaderProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  onBeatmapLoad: (youtubeVideoId?: string, notes?: Note[]) => void; // youtubeVideoId optional, notes from beatmap conversion
}

export function BeatmapLoader({ difficulty, onBeatmapLoad }: BeatmapLoaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [beatmapText, setBeatmapText] = useState("");
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

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
      
      // Validate that beatmap has notes
      if (convertedNotes.length === 0) {
        const msg = "Beatmap has no notes after conversion";
        setError(msg);
        GameErrors.log(`BeatmapLoader: ${msg}`);
        return;
      }

      onBeatmapLoad(youtubeVideoId, convertedNotes);
      setIsLoaded(true);
      setBeatmapText("");
      setIsOpen(false);
    } catch (error) {
      const msg = `Beatmap loading error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(msg);
      GameErrors.log(`BeatmapLoader: ${msg}`);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-30">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 font-rajdhani text-xs gap-1.5 ${
              isLoaded ? 'bg-neon-cyan/20' : ''
            }`}
            data-testid="button-load-beatmap"
          >
            <Music size={14} />
            {isLoaded ? 'BEATMAP LOADED' : 'LOAD BEATMAP'}
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-black/95 border-neon-cyan/50 backdrop-blur-sm max-w-5xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-neon-cyan font-orbitron tracking-wider">
              LOAD BEATMAP
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Main content area: textarea and instructions side-by-side */}
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Left: Textarea */}
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <label className="text-sm text-neon-pink font-rajdhani">
                  Paste Beatmap Text ({difficulty})
                </label>
                <Textarea
                  placeholder={`[METADATA]
title: Song Name
artist: Artist
bpm: 120
duration: 180000
youtube: https://youtube.com/watch?v=...

[${difficulty}]
1000|0|TAP
2000|1|TAP
3000|-1|HOLD_START|hold_1
4000|-1|HOLD_END|hold_1
5000|2|TAP`}
                  value={beatmapText}
                  onChange={(e) => {
                    setBeatmapText(e.target.value);
                    setError("");
                  }}
                  className="bg-black/50 border-neon-cyan/30 text-white placeholder:text-white/20 font-mono text-xs resize-none flex-1"
                  data-testid="textarea-beatmap"
                />
              </div>

              {/* Right: Instructions */}
              <div className="w-64 flex flex-col gap-2 overflow-y-auto">
                <div className="bg-black/50 border border-neon-cyan/20 rounded p-3 text-xs text-white/60 font-rajdhani space-y-2 flex-shrink-0">
                  <p className="font-bold text-neon-cyan">FORMAT</p>
                  <div className="space-y-1">
                    <p className="text-white/80">[METADATA]:</p>
                    <p className="ml-2 text-white/50">title, artist, bpm</p>
                    <p className="ml-2 text-white/50">duration, youtube</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-neon-cyan mt-2">TAP:</p>
                    <p className="font-mono ml-2 text-white/50">time|lane|TAP</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-neon-cyan">HOLD:</p>
                    <p className="font-mono ml-2 text-white/50 text-xs">start|lane</p>
                    <p className="font-mono ml-2 text-white/50 text-xs">|HOLD_START</p>
                    <p className="font-mono ml-2 text-white/50 text-xs">end|lane</p>
                    <p className="font-mono ml-2 text-white/50 text-xs">|HOLD_END</p>
                  </div>
                  <div className="space-y-1 mt-2">
                    <p className="text-white/50 text-xs">Lanes:</p>
                    <p className="ml-2 text-white/40 text-xs">0-3: pads</p>
                    <p className="ml-2 text-white/40 text-xs">-1: Q (left)</p>
                    <p className="ml-2 text-white/40 text-xs">-2: P (right)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-xs text-neon-pink font-rajdhani">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={handleLoadBeatmap}
                className="flex-1 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-rajdhani font-bold"
                data-testid="button-confirm-beatmap"
              >
                LOAD
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-neon-pink text-neon-pink hover:bg-neon-pink/10 font-rajdhani"
                data-testid="button-cancel-beatmap"
              >
                CANCEL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
