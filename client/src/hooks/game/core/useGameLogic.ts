import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { GameState, Note } from '@/types/game';
import { usePauseLogic } from '@/hooks/game/mechanics/usePauseLogic';
import { useKeyControls } from '@/hooks/game/input/useKeyControls';
import { useCountdown } from '@/hooks/game/mechanics/useCountdown';
import { useFadeAnimation } from '@/hooks/effects/animation/useFadeAnimation';
import { useAutoStart } from '@/hooks/game/mechanics/useAutoStart';
import { useRewind } from '@/hooks/game/mechanics/useRewind';
import { audioManager } from '@/lib/audio/audioManager';

interface UseGameLogicProps {
  gameState: GameState;
  currentTime: number;
  isPaused: boolean;
  notes: Note[];
  getVideoTime?: (() => number | null) | null;
  resumeGame: () => void;
  restartGame: () => void;
  startGame: () => void;
  setGameState: (state: GameState) => void;
  setCurrentTime: (time: number) => void;
  hitNote: (noteId: number) => void;
  trackHoldStart: (noteId: number) => boolean;
  trackHoldEnd: (noteId: number) => void;
  customNotes?: Note[];
  engineRef?: React.RefObject<any>;
  setPauseMenuOpen?: (open: boolean) => void;
  onHome?: () => void;
  youtubeIsReady?: boolean;
  youtubeVideoId?: string | null;
  onPlayYouTube?: () => Promise<void>;
}

interface UseGameLogicReturn {
  isPauseMenuOpen: boolean;
  countdownSeconds: number;
  resumeFadeOpacity: number;
  gameErrors: any[];
  handleLeftDeckSpin: () => void;
  handleRightDeckSpin: () => void;
  handleRewind: () => Promise<void>;
  handleResume: () => void;
  pauseGame: () => void;
}

export function useGameLogic({
  gameState,
  currentTime,
  getVideoTime,
  resumeGame,
  restartGame,
  startGame,
  setGameState,
  setCurrentTime,
  hitNote,
  trackHoldStart,
  trackHoldEnd,
  customNotes,
  engineRef,
  setPauseMenuOpen,
  youtubeIsReady = true,
  youtubeVideoId,
  onPlayYouTube,
}: UseGameLogicProps): UseGameLogicReturn {
  const [isPauseMenuOpen, setIsPauseMenuOpenLocal] = useState(false);
  const [resumeFadeOpacity, setResumeFadeOpacity] = useState(0);

  const setPauseMenuOpenHandler = useCallback((open: boolean) => {
    setPauseMenuOpen?.(open);
    setIsPauseMenuOpenLocal(open);
  }, [setPauseMenuOpen]);

  // Deck handlers
  const handleLeftDeckSpin = useCallback(() => {
    audioManager.play('spinNote');
    hitNote(-1);
  }, [hitNote]);
  const handleRightDeckSpin = useCallback(() => {
    audioManager.play('spinNote');
    hitNote(-2);
  }, [hitNote]);

  // Pause logic
  const { pauseGame: pauseHandler, handleResume } = usePauseLogic({
    getVideoTime: getVideoTime ?? undefined,
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Rewind (must be declared before useKeyControls)
  const { handleRewind } = useRewind({ 
    setPauseMenuOpen: setPauseMenuOpenHandler,
    engineRef,
    startGame
  });

  // Key controls
  useKeyControls({
    onPause: pauseHandler,
    onResume: handleResume,
    onRewind: handleRewind,
    onHitNote: hitNote,
    onTrackHoldStart: trackHoldStart,
    onTrackHoldEnd: trackHoldEnd,
  });

  // Countdown
  useCountdown({
    gameState,
    onCountdownComplete: () => setGameState('RESUMING'),
    setPauseMenuOpen: setPauseMenuOpenHandler,
  });

  // Fade animation
  useFadeAnimation({
    gameState,
    resumeGame,
    setGameState,
    setResumeFadeOpacity,
  });

  // Auto-start (YouTube: play first via callback, then game starts via onPlaying | Non-YouTube: start directly)
  useAutoStart({ customNotes: customNotes ?? [], startGame, youtubeIsReady, youtubeVideoId, onPlayYouTube });

  // Reset on game state changes
  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      setIsPauseMenuOpenLocal(false);
    } else if (gameState === 'PLAYING') {
      setIsPauseMenuOpenLocal(false);
    } else if (gameState === 'RESUMING') {
      setIsPauseMenuOpenLocal(false);
    }
  }, [gameState]);

  return {
    isPauseMenuOpen,
    countdownSeconds: useGameStore(s => s.countdownSeconds), // From store
    resumeFadeOpacity,
    gameErrors: [],
    handleLeftDeckSpin,
    handleRightDeckSpin,
    handleRewind,
    handleResume,
    pauseGame: pauseHandler,
  };
}