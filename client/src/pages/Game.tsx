import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useGameEngine } from "@/hooks/useGameEngine";
import { useGameStore } from "@/stores/useGameStore";
import { Difficulty, Note } from "@/lib/engine/gameTypes";
import { parseBeatmap } from "@/lib/beatmap/beatmapParser";
import { convertBeatmapNotes } from "@/lib/beatmap/beatmapConverter";

import { useYouTubePlayer } from "@/hooks/useYoutubePlayer";
import { useGameLogic } from "@/hooks/useGameLogic";
import { useShake } from "@/hooks/useShake";
import { useIdleRotationManager } from "@/hooks/useIdleRotation";
import { useAudioEffects } from "@/hooks/useAudioEffects";
import { audioManager } from "@/lib/audio/audioManager";
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
  youtubeVideoId?: string | null;
}

function Game({ difficulty, onBackToHome, playerInitializedRef, youtubeVideoId: propYoutubeVideoId }: GameProps) {
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();
  const setBeatmapBpm = useGameStore(state => state.setBeatmapBpm);

  // Initialize idle rotation animation
  useIdleRotationManager();
  
  // Audio effects - monitors game events and plays sounds
  useAudioEffects();

  // Store startGame in ref for use in callbacks
  const startGameRef = useRef<(() => void) | null>(null);
  const engineRefForLogic = useRef<any>(null);

  // Screen shake offset
  const shakeOffset = useShake();

  // YouTube hook first – provides getVideoTime with caching
  const { getVideoTime, resetTime, seek, isReady } = useYouTubePlayer({
    videoId: youtubeVideoId,
    playerInitializedRef
  });
  
  // Callback when YouTube confirms playing - triggers game start
  const handleYouTubePlaying = useCallback(() => {
    startGameRef.current?.();
  }, []);

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
    setGameState,
    resetScorer,
    resetRotation
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
      resetTime: resetTime, // Expose resetTime to logic
      resetScorer: resetScorer, // Expose resetScorer for rewind
      resetRotation: resetRotation // Expose resetRotation for rewind
    };
  }, [currentTime, resetTime, resetScorer, resetRotation]);

  // Function to play YouTube when auto-start triggers (before game starts)
  const onPlayYouTube = useCallback(async () => {
    try {
      const { playYouTubeVideo } = await import('@/lib/youtube');
      await playYouTubeVideo();
      console.log('[AUTO-START] YouTube video playing - calling onPlaying callback');
      // YouTube is confirmed playing - trigger game start
      handleYouTubePlaying();
    } catch (err) {
      console.error('[AUTO-START] YouTube play failed:', err);
    }
  }, [handleYouTubePlaying]);

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
    youtubeIsReady: youtubeVideoId ? isReady : true, // If no YouTube video, consider ready; otherwise wait for YouTube
    youtubeVideoId,
    onPlayYouTube
  });

  // Memoized values - ensure notes is always an array
  const missCount = useMemo(() => {
    const missedNotes = (notes || []).filter(n => 
      n.missed || n.tapMissFailure || n.holdMissFailure || n.tapTooEarlyFailure || n.tooEarlyFailure || n.holdReleaseFailure
    );
    const count = missedNotes.length;
    console.log('[GAME] missCount calculation - total notes:', notes?.length, 'missed:', count);
    if (count > 0) {
      console.log('[GAME] Missed notes:', missedNotes.map(n => ({ id: n.id, lane: n.lane, flags: { missed: n.missed, tapMiss: n.tapMissFailure, holdMiss: n.holdMissFailure } })));
    }
    return count;
  }, [notes]);
  const scoreDisplay = useMemo(() => score.toString().padStart(6, '0'), [score]);

  // Load beatmap from localStorage and re-parse with new difficulty
  useEffect(() => {
    // Preload audio on mount
    audioManager.preload().catch(err => {
      console.error('[GAME] Failed to preload audio:', err);
    });
    
    // Sync audio manager with store settings
    const { soundVolume, soundMuted } = useGameStore.getState();
    audioManager.setVolume(soundVolume);
    audioManager.setMuted(soundMuted);
    
    const pendingBeatmapStr = localStorage.getItem('pendingBeatmap');
    if (pendingBeatmapStr) {
      try {
        const beatmapData = JSON.parse(pendingBeatmapStr);
        setYoutubeVideoId(beatmapData.youtubeVideoId || null);
        
        console.log('[GAME] Parsing beatmap with difficulty:', difficulty);
        
        // Re-parse beatmap with the new difficulty to get correct notes
        if (beatmapData.beatmapText) {
          const parsed = parseBeatmap(beatmapData.beatmapText, difficulty);
          if (!parsed.error && parsed.notes) {
            const beatmapStartOffset = parsed.metadata?.beatmapStart || 0;
            const convertedNotes = convertBeatmapNotes(parsed.notes, beatmapStartOffset);
            console.log('[GAME] Loaded', convertedNotes.length, 'notes for difficulty:', difficulty);
            setCustomNotes(convertedNotes);
            // Update beatmap BPM for geometry calculations
            if (parsed.metadata?.bpm) {
              setBeatmapBpm(parsed.metadata.bpm);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load pending beatmap:', error);
      }
    }
  }, [difficulty]); // Re-parse when difficulty changes

  // Reset ALL game state and YouTube player when difficulty changes
  useEffect(() => {
    const resetAll = async () => {
      // Full game state reset: score, combo, health, isPaused, notes, currentTime
      restartGame();
      // Reset YouTube player to time 0
      resetTime();
      // Seek player to beginning (seekYouTubeVideo is async)
      await seek(0);
    };
    resetAll().catch(() => {
      // Silently fail on seek errors - game can continue
    });
  }, [difficulty, restartGame, resetTime, seek]);

  if (gameState === 'GAME_OVER') {
    return <GameOverScreen onRestart={() => window.location.reload()} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col relative">
      {/* Resume Overlay */}
      <ResumeOverlay visible={gameState === 'RESUMING'} opacity={resumeFadeOpacity} />

      {/* Visual Effects */}
      <VisualEffects combo={combo} health={health} missCount={missCount} />

      {/* Main game container with screen shake applied */}
      <div 
        className="absolute inset-0 flex flex-col"
        style={{
          transform: `translate(${shakeOffset.x}px, ${shakeOffset.y}px)`,
        }}
      >
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
    </div>
  );
}

export default Game;