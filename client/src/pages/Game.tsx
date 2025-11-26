import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGameEngine, Difficulty } from "@/lib/gameEngine";
import { CamelotWheel } from "@/components/game/CamelotWheel";
import { SoundPad } from "@/components/game/SoundPad";
import { motion } from "framer-motion";

export default function Game() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const difficulty = (searchParams.get('difficulty') || 'MEDIUM') as Difficulty;
  
  const { 
    gameState, 
    score, 
    combo, 
    health, 
    notes, 
    currentTime, 
    startGame, 
    hitNote 
  } = useGameEngine(difficulty);

  useEffect(() => {
    startGame();
  }, []);

  if (gameState === 'GAMEOVER') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center space-y-8">
        <h1 className="text-6xl font-orbitron text-destructive neon-text-pink">SYSTEM CRITICAL</h1>
        <div className="text-2xl font-rajdhani">
          <p>FINAL SCORE: {score}</p>
          <p>MAX COMBO: {combo}</p>
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
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black opacity-80" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
      
      {/* HUD */}
      <header className="relative z-10 flex justify-between items-center p-6 border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-neon-cyan flex items-center justify-center text-neon-cyan font-bold">
            {Math.floor(health)}%
          </div>
          <div className="h-2 w-32 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-cyan transition-all duration-300"
              style={{ width: `${health}%` }}
            />
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-orbitron text-white tracking-widest tabular-nums">
            {score.toString().padStart(6, '0')}
          </h2>
          <p className="text-neon-pink font-rajdhani text-sm tracking-[0.5em] uppercase">score</p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-neon-purple neon-text-pink">x{combo}</div>
          <div className="text-xs text-white/50">COMBO</div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative z-10 flex items-center justify-center gap-8 lg:gap-24">
        
        {/* Left Deck */}
        <div className="hidden lg:block">
           <CamelotWheel 
             side="left" 
             onSpin={() => hitNote(-1)} 
             notes={notes} 
             currentTime={currentTime} 
           />
        </div>

        {/* Center Sound Pads */}
        <div className="relative z-20 scale-110">
          <SoundPad 
            onPadHit={hitNote} 
            notes={notes} 
            currentTime={currentTime} 
          />
        </div>

        {/* Right Deck */}
        <div className="hidden lg:block">
           <CamelotWheel 
             side="right" 
             onSpin={() => hitNote(-2)} 
             notes={notes} 
             currentTime={currentTime} 
           />
        </div>
      </main>
      
      {/* Controls Hint */}
      <div className="absolute bottom-4 w-full text-center text-white/20 text-xs">
        USE [3][4][8][9] FOR PADS // DECK A [Q][W] // DECK B [O][P]
      </div>
    </div>
  );
}
