import { useEffect, useState, useRef, useMemo } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";
import { Difficulty, Note } from "@/lib/engine/gameTypes";
import { motion } from "framer-motion";

import { useYouTubePlayer } from "@/hooks/useYoutubePlayer";
import { useGameLogic } from "@/hooks/useGameLogic";
import { getYouTubeVideoTime } from "@/lib/youtube";
import { GameOverScreen } from "@/components/screens/GameOverScreen";
import { PauseMenu } from "@/components/ui/HUD/PauseMenu";
import { ResumeOverlay } from "@/components/screens/ResumeOverlay";
import { HealthDisplay } from "@/components/ui/HUD/HealthDisplay";
import { ScoreDisplay } from "@/components/ui/HUD/ScoreDisplay";
import { ComboDisplay } from "@/components/ui/HUD/ComboDisplay";
import { ErrorIndicator } from "@/components/ui/HUD/ErrorIndicator";
import { ControlsHint } from "@/components/ui/HUD/ControlsHint";
import { VisualEffects } from "@/components/game/effects/VisualEffects";
import { DeckHoldMeters } from "@/components/game/hud/DeckHoldMeters";
import { CamelotWheel } from "@/components/game/effects/CamelotWheel";
import { Down3DNoteLane } from "@/components/game/Down3DNoteLane";
import { ErrorLogViewer } from "@/components/game/loaders/ErrorLogViewer";

interface GameProps {
  difficulty: Difficulty;
  onBackToHome?: () => void;
  youtubeIframeRef: React.RefObject<HTMLIFrameElement>;
  playerInitializedRef: React.MutableRefObject<boolean>;
}

export default function Game({ difficulty, onBackToHome, youtubeIframeRef, playerInitializedRef }: GameProps) {
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();
  const [currentTimeState, setCurrentTimeState] = useState(0);

  // Store startGame in ref for use in callbacks
  const startGameRef = useRef<(() => void) | null>(null);
  const engineRefForLogic = useRef<any>(null);

  // YouTube hook first – provides getVideoTime with caching
  const {
    getVideoTime,
    isReady: playerReady
  } = useYouTubePlayer({
    videoId: youtubeVideoId,
    playerInitializedRef,
    onPlaying: () => startGameRef.current?.()
  });

  // Game engine - receives YouTube time via hook (with caching)
  const { 
    gameState, 
    score, 
    combo, 
    health, 
    notes, 
    currentTime, 
    isPaused,
    startGame, 
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    pauseGame,
    resumeGame,
    restartGame,
    setGameState
  } = useGameEngine({ 
    difficulty, 
    customNotes, 
    getVideoTime
  });

  // Store refs for callbacks
  useEffect(() => {
    startGameRef.current = startGame;
  }, [startGame]);

  useEffect(() => {
    engineRefForLogic.current = { 
      setCurrentTime: setCurrentTimeState, 
      getCurrentTime: () => currentTime 
    };
  }, [currentTime]);

  // Game logic hooks (pause, keys, sync, errors)
  const {
    isPauseMenuOpen,
    countdownSeconds,
    resumeFadeOpacity,
    gameErrors,
    handleLeftDeckSpin,
    handleRightDeckSpin,
    handleRewind,
    handleResume
  } = useGameLogic({
    gameState,
    currentTime,
    isPaused,
    notes,
    getVideoTime,
    pauseGame,
    resumeGame,
    restartGame,
    startGame,
    setGameState,
    setCurrentTime: (time) => setCurrentTimeState(time),
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    customNotes,
    engineRef: engineRefForLogic,
    onHome: onBackToHome
  });

  // Memoized values
  const missCount = useMemo(() => notes.filter(n => n.missed).length, [notes]);
  const scoreDisplay = useMemo(() => score.toString().padStart(6, '0'), [score]);

  // Load beatmap from localStorage
  useEffect(() => {
    const pendingBeatmapStr = localStorage.getItem('pendingBeatmap');
    if (pendingBeatmapStr) {
      try {
        const beatmapData = JSON.parse(pendingBeatmapStr);
        setYoutubeVideoId(beatmapData.youtubeVideoId || null);
        setCustomNotes(beatmapData.notes || undefined);
        localStorage.removeItem('pendingBeatmap');
      } catch (error) {
        console.error('Failed to load pending beatmap:', error);
        localStorage.removeItem('pendingBeatmap');
      }
    }
  }, []);

  // Auto-play YouTube when game starts for first time
  const autoPlayOnceRef = useRef(true);
  useEffect(() => {
    if (gameState === 'IDLE') {
      autoPlayOnceRef.current = true; // Reset on game over/reload
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'PLAYING' && autoPlayOnceRef.current && youtubeVideoId) {
      autoPlayOnceRef.current = false;
      const playVideo = async () => {
        try {
          const { playYouTubeVideo } = await import('@/lib/youtube');
          await playYouTubeVideo();
          console.log('[START-SESSION] Video playing');
        } catch (err) {
          console.error('[START-SESSION] Play failed:', err);
        }
      };
      playVideo();
    }
  }, [gameState, youtubeVideoId]);

  if (gameState === 'GAME_OVER') {
    return <GameOverScreen score={score} combo={combo} errors={gameErrors.length} onRestart={() => window.location.reload()} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Resume Overlay */}
      <ResumeOverlay visible={gameState === 'RESUMING'} opacity={resumeFadeOpacity} />

      {/* Visual Effects */}
      <VisualEffects combo={combo} health={health} missCount={missCount} />

      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-40" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay" />

      {/* Pause Menu */}
      {isPauseMenuOpen && isPaused && (
        <PauseMenu
          countdownSeconds={countdownSeconds}
          onResume={handleResume}
          onRewind={handleRewind}
          onHome={onBackToHome}
        />
      )}

      {/* HUD Header */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <HealthDisplay health={health} />
          <ErrorIndicator count={gameErrors.length} />
        </div>
        <ScoreDisplay score={scoreDisplay} />
        <ComboDisplay combo={combo} />
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-4">
        <div className="absolute left-8">
          <CamelotWheel side="left" onSpin={handleLeftDeckSpin} />
        </div>
        <div className="absolute left-[200px] right-[200px] top-1/2 -translate-y-1/2 h-48">
          <DeckHoldMeters notes={notes} currentTime={Math.round(currentTime)} />
        </div>
        <div className="relative flex-1 flex items-center justify-center">
          <Down3DNoteLane 
            notes={notes} 
            currentTime={Math.round(currentTime)}
            health={health}
            combo={combo}
            onPadHit={hitNote}
            onDeckHoldStart={trackHoldStart}
            onDeckHoldEnd={trackHoldEnd}
          />
        </div>
        <div className="absolute right-8">
          <CamelotWheel side="right" onSpin={handleRightDeckSpin} />
        </div>
      </main>

      {/* Controls Hint */}
      <ControlsHint />

      {/* Error Log */}
      <ErrorLogViewer />
    </div>
  );
}