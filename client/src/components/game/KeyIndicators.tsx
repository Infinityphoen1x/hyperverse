import { motion } from "framer-motion";

export function KeyIndicators() {
  const keys = [
    { label: 'W', position: 'bottom-4 left-8', color: 'rgb(255,0,127)' },    // Pink
    { label: 'O', position: 'bottom-4 right-8', color: 'rgb(0,150,255)' },   // Blue
    { label: 'E', position: 'top-32 left-12', color: 'rgb(0,255,255)' },     // Cyan
    { label: 'I', position: 'top-32 right-12', color: 'rgb(190,0,255)' },    // Purple
  ];

  return (
    <>
      {keys.map((key) => (
        <motion.div
          key={key.label}
          className={`absolute ${key.position} w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl font-orbitron pointer-events-none`}
          style={{
            boxShadow: `0 0 30px ${key.color}, 0 0 60px ${key.color}`,
            border: `2px solid ${key.color}`,
            backgroundColor: `rgba(0, 0, 0, 0.3)`,
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {key.label}
        </motion.div>
      ))}
    </>
  );
}
