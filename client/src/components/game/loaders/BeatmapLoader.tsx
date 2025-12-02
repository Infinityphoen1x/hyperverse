// src/components/BeatmapLoader.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Music } from "lucide-react";
import { useBeatmapLoader } from '@/hooks/useBeatmapLoader';
import { BeatmapData } from '@/lib/beatmap/beatmapParser';

interface BeatmapLoaderProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onBeatmapLoad: (data: BeatmapData, beatmapText: string) => void;
}

export function BeatmapLoader({ difficulty, isOpen, setIsOpen, onBeatmapLoad }: BeatmapLoaderProps) {
  const {
    beatmapText,
    error,
    isBeatmapLoaded,
    handleBeatmapTextChange,
    handleLoadBeatmap,
    handleQuickLoadEscapingGravity,
  } = useBeatmapLoader({ difficulty, onBeatmapLoad });

  return (
    <div className="absolute top-4 left-4 z-30">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 font-rajdhani text-xs gap-1.5 ${
              isBeatmapLoaded ? 'bg-neon-cyan/20' : ''
            }`}
            data-testid="button-load-beatmap"
          >
            <Music size={14} />
            {isBeatmapLoaded ? 'BEATMAP LOADED' : 'LOAD BEATMAP'}
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
                  value={beatmapText}
                  onChange={(e) => handleBeatmapTextChange(e.target.value)}
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
                    <p className="ml-2 text-white/50">beatmapStart, beatmapEnd</p>
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
                onClick={handleQuickLoadEscapingGravity}
                size="sm"
                className="bg-neon-yellow/30 text-neon-yellow hover:bg-neon-yellow/50 font-rajdhani text-xs"
                data-testid="button-quick-load-gravity"
              >
                ESCAPING GRAVITY
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