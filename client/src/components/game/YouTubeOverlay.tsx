import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractYouTubeId, buildYouTubeEmbedUrl } from "@/lib/youtubeUtils";
import { GameErrors } from "@/lib/gameEngine";
import {
  YOUTUBE_LABEL_BUTTON,
  YOUTUBE_DIALOG_TITLE,
  YOUTUBE_INPUT_LABEL,
  YOUTUBE_INPUT_PLACEHOLDER,
  YOUTUBE_ERROR_EMPTY,
  YOUTUBE_ERROR_INVALID,
  YOUTUBE_BUTTON_LOAD,
  YOUTUBE_BUTTON_CANCEL,
  YOUTUBE_PREVIEW_LABEL,
  YOUTUBE_PREVIEW_TITLE,
  YOUTUBE_HELP_TEXT,
  YOUTUBE_PREVIEW_WIDTH,
  YOUTUBE_PREVIEW_HEIGHT,
  YOUTUBE_PREVIEW_OPACITY_DEFAULT,
  YOUTUBE_PREVIEW_OPACITY_HOVER,
  YOUTUBE_CLOSE_ICON_SIZE,
} from "@/lib/gameConstants";
import { X } from "lucide-react";

interface YouTubeOverlayProps {
  onVideoUrlChange: (videoId: string) => void;
}

export function YouTubeOverlay({ onVideoUrlChange }: YouTubeOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleLoadVideo = () => {
    setError("");
    if (!urlInput.trim()) {
      setError(YOUTUBE_ERROR_EMPTY);
      GameErrors.log(`YouTubeOverlay: ${YOUTUBE_ERROR_EMPTY}`);
      return;
    }

    try {
      const id = extractYouTubeId(urlInput);
      if (!id) {
        const msg = `${YOUTUBE_ERROR_INVALID}: "${urlInput}"`;
        setError(msg);
        GameErrors.log(`YouTubeOverlay: ${msg}`);
        return;
      }

      setVideoId(id);
      onVideoUrlChange(id);
      setUrlInput("");
      setIsOpen(false);
    } catch (error) {
      const msg = `YouTube video loading error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(msg);
      GameErrors.log(`YouTubeOverlay: ${msg}`);
    }
  };

  const handleClearVideo = () => {
    try {
      setVideoId(null);
      setUrlInput("");
      GameErrors.log(`YouTubeOverlay: Video cleared`);
    } catch (error) {
      GameErrors.log(`YouTubeOverlay: Error clearing video: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-30 flex gap-2">
      {videoId && (
        <div className="relative bg-black/80 backdrop-blur-sm border border-neon-cyan/30 rounded px-3 py-1 text-xs text-neon-cyan font-rajdhani">
          <div className="flex items-center gap-2">
            <span className="line-clamp-1">{YOUTUBE_PREVIEW_LABEL}</span>
            <button
              onClick={handleClearVideo}
              className="hover:text-neon-pink transition-colors"
              data-testid="button-clear-video"
            >
              <X size={YOUTUBE_CLOSE_ICON_SIZE} />
            </button>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-neon-pink text-neon-pink hover:bg-neon-pink/10 font-rajdhani text-xs"
            data-testid="button-load-youtube"
          >
            {YOUTUBE_LABEL_BUTTON}
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-black/95 border-neon-cyan/50 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-neon-cyan font-orbitron tracking-wider">
              {YOUTUBE_DIALOG_TITLE}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-neon-pink font-rajdhani">
                {YOUTUBE_INPUT_LABEL}
              </label>
              <Input
                placeholder={YOUTUBE_INPUT_PLACEHOLDER}
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLoadVideo()}
                className="bg-black/50 border-neon-cyan/30 text-white placeholder:text-white/20 font-rajdhani"
                data-testid="input-youtube-url"
              />
            </div>

            {error && (
              <p className="text-xs text-neon-pink font-rajdhani">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleLoadVideo}
                className="flex-1 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-rajdhani font-bold"
                data-testid="button-confirm-youtube"
              >
                {YOUTUBE_BUTTON_LOAD}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-neon-pink text-neon-pink hover:bg-neon-pink/10 font-rajdhani"
                data-testid="button-cancel-youtube"
              >
                {YOUTUBE_BUTTON_CANCEL}
              </Button>
            </div>

            <p className="text-xs text-white/40 font-rajdhani">
              {YOUTUBE_HELP_TEXT}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {videoId && (
        <div 
          className="absolute top-full mt-2 right-0 rounded overflow-hidden border border-neon-cyan/20 transition-opacity"
          style={{
            width: `${YOUTUBE_PREVIEW_WIDTH}px`,
            height: `${YOUTUBE_PREVIEW_HEIGHT}px`,
            opacity: YOUTUBE_PREVIEW_OPACITY_DEFAULT
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = String(YOUTUBE_PREVIEW_OPACITY_HOVER))}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = String(YOUTUBE_PREVIEW_OPACITY_DEFAULT))}
        >
          {videoId && (
            <iframe
              width="100%"
              height="100%"
              src={buildYouTubeEmbedUrl(videoId, {
                autoplay: false,
                controls: false,
                modestBranding: true,
                enableJsApi: true
              })}
              title={YOUTUBE_PREVIEW_TITLE}
              allow="autoplay"
              className="pointer-events-none"
              data-testid="iframe-youtube"
            />
          )}
        </div>
      )}
    </div>
  );
}
