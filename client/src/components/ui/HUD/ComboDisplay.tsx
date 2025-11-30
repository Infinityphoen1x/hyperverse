import { motion } from "framer-motion";

interface ComboDisplayProps {
  combo: number;
}

export function ComboDisplay({ combo }: ComboDisplayProps) {
  return (
    <div className="text-right flex items-center gap-4">
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
  );
}