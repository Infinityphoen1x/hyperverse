import { motion } from "framer-motion";

interface ScoreDisplayProps {
  score: string;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  return (
    <div className="text-center">
      <motion.h2 
        className="text-4xl font-orbitron text-white tracking-widest tabular-nums neon-glow"
        animate={parseInt(score) % 500 === 0 && parseInt(score) > 0 ? { scale: [1, 1.2, 1], textShadow: ['0 0 10px white', '0 0 30px hsl(320, 100%, 60%)', '0 0 10px white'] } : {}}
        transition={{ duration: 0.3 }}
      >
        {score}
      </motion.h2>
      <p className="text-neon-pink font-rajdhani text-sm tracking-[0.5em] uppercase">score</p>
    </div>
  );
}