// src/components/ParticleSystem.tsx
import { m } from "@/lib/motion/MotionProvider";
import { Particle } from '@/types/visualEffects';

interface ParticleSystemProps { particles: Particle[]; }

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ particles }) => (
  <>
    {particles.map(particle => (
      <m.div
        key={particle.id}
        initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 1, scale: 1 }}
        animate={{
          x: `${particle.x + (Math.random() - 0.5) * 200}%`,
          y: `${particle.y - 200}%`,
          opacity: 0,
          scale: 0,
        }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute rounded-full"
        style={{
          left: '50%', top: '50%',
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          backgroundColor: particle.color,
          boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
        }}
      />
    ))}
  </>
);