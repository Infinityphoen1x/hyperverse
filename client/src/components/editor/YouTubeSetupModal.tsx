import { useState } from 'react';
import { Youtube } from 'lucide-react';

interface YouTubeSetupModalProps {
  onSubmit: (videoId: string) => void;
}

export function YouTubeSetupModal({ onSubmit }: YouTubeSetupModalProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const extractVideoId = (input: string): string | null => {
    // YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleSubmit = () => {
    const videoId = extractVideoId(input.trim());
    if (!videoId) {
      setError('Invalid YouTube URL or Video ID');
      return;
    }
    setError('');
    onSubmit(videoId);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border-2 border-neon-cyan rounded-lg p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <Youtube className="w-8 h-8 text-neon-cyan" />
          <h2 className="text-2xl font-rajdhani font-bold text-neon-cyan">
            YOUTUBE VIDEO REQUIRED
          </h2>
        </div>

        <p className="text-gray-300 mb-6 text-sm">
          Enter a YouTube video URL or video ID to enable audio sync and preview in the editor.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-rajdhani text-gray-400 mb-2">
              YouTube URL or Video ID
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
              className="w-full bg-black border border-neon-cyan/30 text-white px-4 py-3 rounded focus:border-neon-cyan focus:outline-none font-mono text-sm"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-xs mt-2">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex-1 px-4 py-3 bg-neon-cyan border border-neon-cyan text-black rounded hover:bg-neon-cyan/80 transition-colors font-rajdhani font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              CONTINUE
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <p className="text-xs text-blue-300">
              <strong>Examples:</strong><br />
              • https://youtube.com/watch?v=dQw4w9WgXcQ<br />
              • https://youtu.be/dQw4w9WgXcQ<br />
              • dQw4w9WgXcQ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
