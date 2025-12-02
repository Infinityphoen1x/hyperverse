import { useEffect, useState, useRef, useMemo } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";
import { Difficulty, Note } from "@/lib/engine/gameTypes";

import { useYouTubePlayer } from "@/hooks/useYoutubePlayer";
import { useGameLogic } from "@/hooks/useGameLogic";
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
  playerInitializedRef: React.RefObject<boolean>;
}

function Game({ difficulty, onBackToHome, playerInitializedRef }: GameProps) {
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();

  // Store startGame in ref for use in callbacks
  const startGameRef = useRef<(() => void) | null>(null);
  const engineRefForLogic = useRef<any>(null);

  // YouTube hook first – provides getVideoTime with caching
  const { getVideoTime, resetTime, isReady } = useYouTubePlayer({
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
      getCurrentTime: () => currentTime,
      resetTime: resetTime // Expose resetTime to logic
    };
  }, [currentTime, resetTime]);

  // Game logic hooks (pause, keys, sync, errors)
  const {
    isPauseMenuOpen,
    resumeFadeOpacity,
    gameErrors,
    handleLeftDeckSpin,
    handleRightDeckSpin,
    handleResume,
    handleRewind
  } = useGameLogic({
    gameState,
    currentTime,
    isPaused,
    notes,
    getVideoTime,
    resumeGame,
    restartGame,
    startGame,
    setGameState,
    setCurrentTime: () => {},
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    customNotes,
    engineRef: engineRefForLogic,
    onHome: onBackToHome,
    youtubeIsReady: youtubeVideoId ? isReady : true // If no YouTube video, consider ready; otherwise wait for YouTube
  });

  // Memoized values - ensure notes is always an array
  const missCount = useMemo(() => (notes || []).filter(n => n.missed).length, [notes]);
  const scoreDisplay = useMemo(() => score.toString().padStart(6, '0'), [score]);

  // Reset game state when component mounts (clears old pause state from previous game)
  useEffect(() => {
    setGameState('IDLE');
  }, [difficulty, setGameState]);

  // Load beatmap from localStorage (keep it there for re-selection with different difficulty)
  useEffect(() => {
    const pendingBeatmapStr = localStorage.getItem('pendingBeatmap');
    if (pendingBeatmapStr) {
      try {
        const beatmapData = JSON.parse(pendingBeatmapStr);
        setYoutubeVideoId(beatmapData.youtubeVideoId || null);
        setCustomNotes(beatmapData.notes || undefined);
      } catch (error) {
        console.error('Failed to load pending beatmap:', error);
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
    return <GameOverScreen onRestart={() => window.location.reload()} />;
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

      {/* Pause Menu - Show immediately when PAUSED, rely on gameState for sync */}
      {gameState === 'PAUSED' && (
        <PauseMenu
          onHome={onBackToHome}
          onResume={handleResume}
          onRewind={handleRewind}
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
            health={health}
            combo={combo}
            onPadHit={hitNote}
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

export default Game;