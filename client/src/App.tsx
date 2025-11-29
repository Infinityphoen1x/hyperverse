import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Game from "@/pages/Game";

function App() {
  const [gameActive, setGameActive] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const handleStartGame = (difficulty: 'EASY' | 'MEDIUM' | 'HARD') => {
    setSelectedDifficulty(difficulty);
    setGameActive(true);
  };

  const handleBackToHome = () => {
    setGameActive(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {/* YouTube player + geometry background - PERSISTENT (never unmounts) */}
        <div className="fixed inset-0 w-full h-full bg-black">
          {!gameActive && (
            // Home page overlay (difficulty selection, beatmap loader, start button)
            <div className="absolute inset-0 z-20">
              <Home onStartGame={handleStartGame} />
            </div>
          )}
          {gameActive && (
            // Game component (replaces home, YouTube/geometry still visible underneath)
            <Game difficulty={selectedDifficulty} onBackToHome={handleBackToHome} />
          )}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
