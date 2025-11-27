import { useEffect, useState, useCallback, useRef } from "react";
import { useGameEngine, Difficulty, GameErrors, Note } from "@/lib/gameEngine";
import { CamelotWheel } from "@/components/game/CamelotWheel";
import { SoundPad } from "@/components/game/SoundPad";
import { Down3DNoteLane } from "@/components/game/Down3DNoteLane";
import { DeckHoldMeters } from "@/components/game/DeckHoldMeters";
import { VisualEffects } from "@/components/game/VisualEffects";
import { YouTubeOverlay } from "@/components/game/YouTubeOverlay";
import { BeatmapLoader } from "@/components/game/BeatmapLoader";
import { motion } from "framer-motion";

export default function Game() {
  const [leftDeckRotation, setLeftDeckRotation] = useState(0);
  const [rightDeckRotation, setRightDeckRotation] = useState(0);
  const [gameErrors, setGameErrors] = useState<string[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [customNotes, setCustomNotes] = useState<Note[] | undefined>();
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const difficulty = (searchParams.get('difficulty') || 'MEDIUM') as Difficulty;
  
  // Function to get current video time from YouTube iframe
  const getVideoTime = useCallback((): number | null => {
    if (!youtubeIframeRef.current) return null;
    try {
      return (youtubeIframeRef.current as any).contentWindow.document.querySelector('video')?.currentTime ?? null;
    } catch {
      return null;
    }
  }, []);
  
  const { 
    gameState, 
    score, 
    combo, 
    health, 
    notes, 
    currentTime, 
    holdStartTimes,
    startGame, 
    hitNote,
    trackHoldStart,
    trackHoldEnd,
    markNoteMissed
  } = useGameEngine(difficulty, youtubeVideoId ? getVideoTime : undefined, customNotes);

  // Memoize hold callbacks to prevent re-creation on every render
  const memoizedTrackHoldStart = useCallback((lane: number) => {
    trackHoldStart(lane);
  }, [trackHoldStart]);

  const memoizedTrackHoldEnd = useCallback((lane: number) => {
    trackHoldEnd(lane);
  }, [trackHoldEnd]);

  // Monitor errors
  useEffect(() => {
    const checkErrors = setInterval(() => {
      if (GameErrors.notes.length > 0) {
        setGameErrors([...GameErrors.notes]);
      }
    }, 1000);
    return () => clearInterval(checkErrors);
  }, []);

  useEffect(() => {
    startGame();
  }, [startGame]);

  if (gameState === 'GAMEOVER') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center space-y-8">
        <h1 className="text-6xl font-orbitron text-destructive neon-text-pink">SYSTEM CRITICAL</h1>
        <div className="text-2xl font-rajdhani">
          <p>FINAL SCORE: {score}</p>
          <p>MAX COMBO: {combo}</p>
          {gameErrors.length > 0 && (
            <div className="text-xs text-neon-yellow mt-4 max-h-20 overflow-y-auto">
              <p>ERRORS DETECTED: {gameErrors.length}</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-neon-blue text-black font-bold hover:bg-white transition-colors"
        >
          REBOOT SYSTEM
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col relative">
      {/* YouTube Background Layer */}
      {youtubeVideoId && (
        <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
          <iframe
            ref={youtubeIframeRef}
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&controls=0&modestbranding=1&mute=1`}
            title="YouTube background"
            allow="autoplay"
            className="w-full h-full"
            data-testid="iframe-youtube-background"
          />
        </div>
      )}

      {/* Visual Effects Layer */}
      <VisualEffects combo={combo} health={health} missCount={notes.filter(n => n.missed).length} />

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
      
      {/* YouTube Overlay Control */}
      <YouTubeOverlay 
        onVideoUrlChange={(url, videoId) => setYoutubeVideoId(videoId)}
      />

      {/* Beatmap Loader */}
      <BeatmapLoader 
        difficulty={difficulty}
        onBeatmapLoad={(beatmapText, youtubeVideoId, notes) => {
          if (youtubeVideoId) {
            setYoutubeVideoId(youtubeVideoId);
          }
          if (notes) {
            setCustomNotes(notes);
          }
        }}
      />

      {/* HUD */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-neon-cyan flex items-center justify-center text-neon-cyan font-bold">
            {Math.floor((health / 200) * 100)}%
          </div>
          <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-cyan transition-all duration-300"
              style={{ width: `${(health / 200) * 100}%` }}
            />
          </div>
          {gameErrors.length > 0 && (
            <div className="text-xs text-neon-yellow font-rajdhani">
              {gameErrors.length} error(s)
            </div>
          )}
        </div>

        <div className="text-center">
          <motion.h2 
            className="text-4xl font-orbitron text-white tracking-widest tabular-nums neon-glow"
            animate={score % 500 === 0 && score > 0 ? { scale: [1, 1.2, 1], textShadow: ['0 0 10px white', '0 0 30px hsl(320, 100%, 60%)', '0 0 10px white'] } : {}}
            transition={{ duration: 0.3 }}
          >
            {score.toString().padStart(6, '0')}
          </motion.h2>
          <p className="text-neon-pink font-rajdhani text-sm tracking-[0.5em] uppercase">score</p>
        </div>

        <div className="text-right">
          <motion.div 
            className="text-3xl font-bold font-orbitron neon-glow"
            style={{ color: combo % 20 === 0 && combo > 0 ? 'hsl(120, 100%, 50%)' : 'hsl(280, 100%, 60%)' }}
            animate={combo > 0 ? { scale: [1, 1.15, 1], rotate: combo % 10 === 0 ? [0, 5, -5, 0] : 0 } : {}}
            transition={{ duration: 0.3 }}
          >
            x{combo}
          </motion.div>
          <div className="text-xs text-white/50">COMBO</div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center px-4">
        
        {/* Left Deck */}
        <div className="hidden lg:block absolute left-8">
           <CamelotWheel 
             side="left" 
             onSpin={() => hitNote(-1)} 
             notes={notes} 
             currentTime={currentTime}
             holdStartTime={holdStartTimes[-1]}
             onHoldStart={() => memoizedTrackHoldStart(-1)}
             onHoldEnd={() => memoizedTrackHoldEnd(-1)}
             onRotationChange={setLeftDeckRotation}
           />
        </div>

        {/* Hold Meters Container */}
        <div className="hidden lg:block absolute left-[200px] right-[200px] top-1/2 -translate-y-1/2 h-48">
          <DeckHoldMeters 
            notes={notes} 
            currentTime={currentTime}
            holdStartTimes={holdStartTimes}
          />
        </div>

        {/* Center 3D Notelane */}
        <div className="relative flex-1 flex items-center justify-center">
          <Down3DNoteLane 
            notes={notes} 
            currentTime={currentTime}
            holdStartTimes={holdStartTimes}
            onNoteMissed={markNoteMissed}
            health={health}
          />
        </div>

        {/* Right Deck */}
        <div className="hidden lg:block absolute right-8">
           <CamelotWheel 
             side="right" 
             onSpin={() => hitNote(-2)} 
             notes={notes} 
             currentTime={currentTime}
             holdStartTime={holdStartTimes[-2]}
             onHoldStart={() => memoizedTrackHoldStart(-2)}
             onHoldEnd={() => memoizedTrackHoldEnd(-2)}
             onRotationChange={setRightDeckRotation}
           />
        </div>

        {/* Sound Pads - At Bottom Center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 scale-75">
          <SoundPad 
            onPadHit={hitNote} 
            notes={notes} 
            currentTime={currentTime} 
          />
        </div>
      </main>
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 w-full text-center text-white/20 text-xs">
        USE [W][E][I][O] FOR PADS // DECK A [Q] TOGGLE // DECK B [P] TOGGLE
      </div>
    </div>
  );
}
