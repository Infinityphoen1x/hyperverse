import { motion } from "framer-motion";

interface GameOverScreenProps {
  score: number;
  combo: number;
  errors: number;
  onRestart: () => void;
}

export function GameOverScreen({ score, combo, errors, onRestart }: GameOverScreenProps) {
  const downloadLogs = () => {
    // Capture browser console logs from window
    const logs = (window as any).__consoleLogs || [];
    const logText = logs.join('\n');
    
    // Create blob and download
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyperverse-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center space-y-8">
      <h1 className="text-6xl font-orbitron text-destructive neon-text-pink">SYSTEM CRITICAL</h1>
      <div className="text-2xl font-rajdhani">
        <p>FINAL SCORE: {score}</p>
        <p>MAX COMBO: {combo}</p>
        {errors > 0 && (
          <div className="text-xs text-neon-yellow mt-4 max-h-20 overflow-y-auto">
            <p>ERRORS DETECTED: {errors}</p>
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          onClick={onRestart}
          className="px-8 py-3 bg-neon-blue text-black font-bold hover:bg-white transition-colors"
          data-testid="button-restart-game"
        >
          REBOOT SYSTEM
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          onClick={downloadLogs}
          className="px-8 py-3 bg-neon-yellow text-black font-bold hover:bg-white transition-colors"
          data-testid="button-download-logs"
        >
          DOWNLOAD LOGS
        </motion.button>
      </div>
    </div>
  );
}
