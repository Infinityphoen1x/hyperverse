import { motion } from 'framer-motion';

interface CountdownOverlayProps {
  seconds: number;
}

export function CountdownOverlay({ seconds }: CountdownOverlayProps) {
  if (seconds <= 0) return null;

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-center"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
      >
        <motion.div
          className="text-9xl font-bold font-orbitron"
          style={{
            background: 'linear-gradient(45deg, #00FFFF, #FF00FF)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 60px rgba(0, 255, 255, 0.8), 0 0 30px rgba(255, 0, 255, 0.6)',
            filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.6))',
          }}
          key={seconds}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {seconds}
        </motion.div>
        <motion.p
          className="text-xl font-rajdhani text-cyan-400 mt-8 uppercase tracking-widest"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          GET READY!
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
