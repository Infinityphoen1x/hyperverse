// src/components/ChromaticAberration.tsx
import { m } from "@/lib/motion/MotionProvider";
import { CHROMATIC_OFFSET_PX } from '@/lib/config';

interface ChromaticAberrationProps { intensity: number; }

export const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({ intensity }) => (
  <m.div
    className="absolute inset-0"
    initial={{ filter: 'none' }}
    animate={{ 
      filter: `drop-shadow(${intensity * CHROMATIC_OFFSET_PX}px 0 0 rgb(255, 0, 127)) drop-shadow(${-intensity * CHROMATIC_OFFSET_PX}px 0 0 rgb(0, 255, 255))` 
    }}
    transition={{ duration: 0.3 }} // CHROMATIC_DURATION / 1000
  />
);