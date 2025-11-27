import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseBeatmap } from "@/lib/beatmapParser";
import { convertBeatmapNotes } from "@/lib/beatmapConverter";
import { Music } from "lucide-react";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

interface BeatmapLoaderProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  onBeatmapLoad: (youtubeVideoId?: string, notes?: any[]) => void;
}

export function BeatmapLoader({ difficulty, onBeatmapLoad }: BeatmapLoaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [beatmapText, setBeatmapText] = useState("");
  const [error, setError] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadBeatmap = () => {
    setError("");
    if (!beatmapText.trim()) {
      setError("Please paste a beatmap");
      return;
    }

    const parsed = parseBeatmap(beatmapText, difficulty);
    if (!parsed) {
      setError(`Failed to parse beatmap for ${difficulty} difficulty`);
      return;
    }

    let youtubeVideoId: string | undefined;
    if (parsed.metadata.youtube) {
      const extractedId = extractYouTubeId(parsed.metadata.youtube);
      if (!extractedId) {
        setError("Invalid YouTube URL in beatmap metadata");
        return;
      }
      youtubeVideoId = extractedId;
    }

    const convertedNotes = convertBeatmapNotes(parsed.notes);
    
    // Validate that beatmap has notes
    if (convertedNotes.length === 0) {
      setError("Beatmap has no notes");
      return;
    }

    onBeatmapLoad(youtubeVideoId, convertedNotes);
    setIsLoaded(true);
    setBeatmapText("");
    setIsOpen(false);
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
        <DialogContent className="bg-black/95 border-neon-cyan/50 backdrop-blur-sm max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-neon-cyan font-orbitron tracking-wider">
              LOAD BEATMAP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-neon-pink font-rajdhani">
                Paste Beatmap Text ({difficulty})
              </label>
              <Textarea
                placeholder={`[METADATA]
title: Song Name
artist: Artist
bpm: 120
duration: 180000

[${difficulty}]
1000|0|TAP
2000|1|TAP
3000|2|HOLD|1000|hold_1`}
                value={beatmapText}
                onChange={(e) => {
                  setBeatmapText(e.target.value);
                  setError("");
                }}
                className="bg-black/50 border-neon-cyan/30 text-white placeholder:text-white/20 font-mono text-xs resize-none"
                rows={20}
                data-testid="textarea-beatmap"
              />
            </div>

            {error && (
              <p className="text-xs text-neon-pink font-rajdhani">{error}</p>
            )}

            <div className="bg-black/50 border border-neon-cyan/20 rounded p-3 text-xs text-white/60 font-rajdhani space-y-1">
              <p className="font-bold text-neon-cyan">FORMAT:</p>
              <p>[METADATA] section with: title, artist, bpm, duration, youtube (optional)</p>
              <p>[EASY/MEDIUM/HARD] sections with notes:</p>
              <p className="font-mono ml-2">time|lane|TAP</p>
              <p className="font-mono ml-2">time|lane|HOLD|duration|holdId</p>
              <p className="text-white/40">Lanes: 0-3 (pads), -1 (left deck), -2 (right deck)</p>
            </div>

            <div className="flex gap-2">
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
