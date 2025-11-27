import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface VisualEffectsProps {
  combo: number;
  score: number;
}

export function VisualEffects({ combo, score }: VisualEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);
  const [chromatic, setChromatic] = useState(0);

  // Add particles on combo milestones
  useEffect(() => {
    if (combo > 0 && combo % 5 === 0) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['hsl(120, 100%, 50%)', 'hsl(0, 100%, 50%)', 'hsl(180, 100%, 50%)', 'hsl(280, 100%, 60%)', 'hsl(320, 100%, 60%)'][Math.floor(Math.random() * 5)],
        size: Math.random() * 8 + 4,
      }));
      
      setParticles(prev => [...prev, ...newParticles].slice(-60)); // Keep last 60 particles
      setShake(1);
      setChromatic(0.8);
      
      setTimeout(() => setShake(0), 300);
      setTimeout(() => setChromatic(0), 400);
    }
  }, [combo]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Screen Shake & Chromatic Aberration Effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          transform: shake > 0 ? `translate(${(Math.random() - 0.5) * 20}px, ${(Math.random() - 0.5) * 20}px)` : 'translate(0, 0)',
          filter: chromatic > 0 ? `drop-shadow(${chromatic * 15}px 0 0 rgb(255, 0, 127)) drop-shadow(${-chromatic * 15}px 0 0 rgb(0, 255, 255))` : 'none',
        }}
        transition={{ type: 'spring', stiffness: 300 }}
      />

      {/* Particle Effects */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          initial={{ 
            x: `${particle.x}%`, 
            y: `${particle.y}%`,
            opacity: 1,
            scale: 1
          }}
          animate={{ 
            x: `${particle.x + (Math.random() - 0.5) * 200}%`, 
            y: `${particle.y - 200}%`,
            opacity: 0,
            scale: 0
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="absolute rounded-full"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
        />
      ))}

      {/* Radial Pulse on Perfect Hits */}
      {combo % 10 === 0 && combo > 0 && (
        <motion.div
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
          style={{
            width: '100px',
            height: '100px',
            borderColor: combo % 20 === 0 ? 'hsl(120, 100%, 50%)' : 'hsl(0, 100%, 50%)',
            boxShadow: combo % 20 === 0 ? '0 0 50px hsl(120, 100%, 50%)' : '0 0 50px hsl(0, 100%, 50%)',
          }}
        />
      )}
    </div>
  );
}
