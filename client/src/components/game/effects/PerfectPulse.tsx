// src/components/PerfectPulse.tsx
import { motion } from 'framer-motion';
import { COMBO_PERFECT_MILESTONE, COLOR_PARTICLE_GREEN, COLOR_PARTICLE_RED } from '@/lib/config';

interface PerfectPulseProps { combo: number; }

export const PerfectPulse: React.FC<PerfectPulseProps> = ({ combo }) => (
  <motion.div
    initial={{ scale: 0.5, opacity: 1 }}
    animate={{ scale: 3, opacity: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
    style={{
      width: '100px',
      height: '100px',
      borderColor: combo % (COMBO_PERFECT_MILESTONE * 2) === 0 ? COLOR_PARTICLE_GREEN : COLOR_PARTICLE_RED,
      boxShadow: combo % (COMBO_PERFECT_MILESTONE * 2) === 0 ? `0 0 50px ${COLOR_PARTICLE_GREEN}` : `0 0 50px ${COLOR_PARTICLE_RED}`,
    }}
  />
);