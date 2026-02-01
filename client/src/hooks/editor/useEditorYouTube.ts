import { useEffect, useCallback, useState, useRef } from 'react';
import { useYouTubePlayer } from '@/hooks/audio/useYoutubePlayer';
import { useGameStore } from '@/stores/useGameStore';
import { useYoutubeStore } from '@/stores/useYoutubeStore';
import { useEditorCoreStore } from '@/stores/useEditorCoreStore';

interface UseEditorYouTubeProps {
  playerInitializedRef: React.RefObject<boolean> | React.MutableRefObject<boolean>;
  currentTime: number;
}

export function useEditorYouTube({
  playerInitializedRef,
  currentTime = 0,
}: UseEditorYouTubeProps = {} as UseEditorYouTubeProps) {
  const [needsYouTubeSetup, setNeedsYouTubeSetup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const lastSyncedTimeRef = useRef(0);
  const videoDurationMs = useYoutubeStore(state => state.videoDurationMs);
  const fallbackPlayerRef = useRef(false);
  
  // Get metadata from store
  const metadata = useEditorCoreStore(state => state.metadata);
  const isPlaying = useEditorCoreStore(state => state.isPlaying);
  const setIsPlaying = useEditorCoreStore(state => state.setIsPlaying);
  const loopStart = useEditorCoreStore(state => state.loopStart);
  const loopEnd = useEditorCoreStore(state => state.loopEnd);
  const setCurrentTime = useGameStore(state => state.setCurrentTime);
  
  // Extract video ID from youtubeUrl
  const videoId = metadata?.youtubeUrl ? extractVideoId(metadata.youtubeUrl) : null;

  function extractVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  }

  // Initialize YouTube player
  const { getVideoTime, seek, play, pause, isReady } = useYouTubePlayer({
    videoId: videoId || null,
    playerInitializedRef: playerInitializedRef || fallbackPlayerRef,
  });

  // Extract YouTube video ID from metadata
  useEffect(() => {
    const checkYouTubeSetup = async () => {
      // Wait a moment to prevent flash during page load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if there's already a YouTube ID in localStorage
      let hasValidYouTubeId = !!videoId;
      
      if (!hasValidYouTubeId) {
        try {
          const pendingBeatmap = localStorage.getItem('pendingBeatmap');
          if (pendingBeatmap) {
            const data = JSON.parse(pendingBeatmap);
            if (data.youtubeVideoId || (data.beatmapText && data.beatmapText.includes('youtubeUrl:'))) {
              hasValidYouTubeId = true;
            }
          }
        } catch (e) {
          console.error('[EDITOR] Failed to check localStorage for YouTube ID:', e);
        }
      }
      
      if (!hasValidYouTubeId) {
        setNeedsYouTubeSetup(true);
      } else {
        setNeedsYouTubeSetup(false);
        
        // Store YouTube ID for player initialization
        if (videoId) {
          const youtubeStore = useYoutubeStore.getState();
          youtubeStore.setVideoId(videoId);
          
          // Save to localStorage
          const existingData = localStorage.getItem('pendingBeatmap');
          const beatmapData = existingData ? JSON.parse(existingData) : {};
          beatmapData.youtubeVideoId = videoId;
          localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
        }
      }
      
      setIsInitializing(false);
    };
    
    checkYouTubeSetup();
  }, [videoId]);

  // Handle YouTube setup
  const handleYouTubeSetup = useCallback((videoId: string) => {
    const youtubeStore = useYoutubeStore.getState();
    youtubeStore.setVideoId(videoId);
    
    // Update metadata with YouTube URL
    const editorStore = useEditorCoreStore.getState();
    editorStore.updateMetadata({ youtubeUrl: `https://youtube.com/watch?v=${videoId}` });
    
    // Save to localStorage
    const existingData = localStorage.getItem('pendingBeatmap');
    const beatmapData = existingData ? JSON.parse(existingData) : {};
    beatmapData.youtubeVideoId = videoId;
    localStorage.setItem('pendingBeatmap', JSON.stringify(beatmapData));
    
    // Trigger player update
    window.dispatchEvent(new CustomEvent('beatmapUpdate'));
    
    setNeedsYouTubeSetup(false);
  }, []);

  // Handle play from user gesture
  const handlePlay = useCallback(async () => {
    if (isReady && play) {
      try {
        await play();
        // Sync time after play
        if (seek) {
          seek(currentTime / 1000);
        }
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play:', error);
        // If autoplay fails, pause immediately
        setIsPlaying(false);
        if (pause) {
          pause();
        }
      }
    } else {
      setIsPlaying(true);
    }
  }, [isReady, play, seek, pause, currentTime, setIsPlaying]);

  // Handle pause
  const handlePause = useCallback(async () => {
    if (pause) {
      await pause();
    }
    setIsPlaying(false);
  }, [pause, setIsPlaying]);

  // Playhead animation - sync with YouTube when playing
  useEffect(() => {
    if (!isPlaying || !metadata) return;
    
    const interval = setInterval(() => {
      const videoTime = isReady && getVideoTime ? getVideoTime() : null;
      const next = videoTime !== null ? videoTime : currentTime + 16;
      const maxPlaybackTime = videoDurationMs || metadata.beatmapEnd;
      
      if (loopEnd && next >= loopEnd) {
        const loopStartTime = loopStart || metadata.beatmapStart;
        setCurrentTime(loopStartTime);
        if (isReady && seek) {
          seek(loopStartTime / 1000);
        }
      } else if (next >= maxPlaybackTime) {
        setIsPlaying(false);
        setCurrentTime(maxPlaybackTime);
        if (pause) {
          pause();
        }
      } else {
        setCurrentTime(next);
      }
    }, 16);
    
    return () => clearInterval(interval);
  }, [
    isPlaying,
    metadata,
    isReady,
    getVideoTime,
    currentTime,
    setCurrentTime,
    loopStart,
    loopEnd,
    videoDurationMs,
    seek,
    pause,
    setIsPlaying,
  ]);

  // Sync YouTube player when currentTime changes manually
  useEffect(() => {
    if (!isPlaying && isReady && seek && Math.abs(currentTime - lastSyncedTimeRef.current) > 100) {
      seek(currentTime / 1000);
      lastSyncedTimeRef.current = currentTime;
    }
  }, [currentTime, isPlaying, isReady, seek]);

  return {
    youtubeVideoId: videoId,
    needsYouTubeSetup,
    isInitializing,
    handleYouTubeSetup,
    handlePlay,
    handlePause,
    isReady,
    videoDurationMs,
  };
}
