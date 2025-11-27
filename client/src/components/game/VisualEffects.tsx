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
  health?: number;
  missCount?: number;
}

export function VisualEffects({ combo, score, health = 100, missCount = 0 }: VisualEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);
  const [chromatic, setChromatic] = useState(0);
  const [glitch, setGlitch] = useState(0);
  const [glitchPhase, setGlitchPhase] = useState(0);
  const [prevMissCount, setPrevMissCount] = useState(0);

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

  // Trigger glitch effect on miss
  useEffect(() => {
    if (missCount > prevMissCount) {
      setGlitch(1);
      setGlitchPhase(0);
      setPrevMissCount(missCount);
      
      // Animate glitch intensity
      const glitchInterval = setInterval(() => {
        setGlitchPhase(prev => {
          if (prev >= 1) {
            setGlitch(0);
            clearInterval(glitchInterval);
            return prev;
          }
          return prev + 0.1;
        });
      }, 50);
      
      return () => clearInterval(glitchInterval);
    }
  }, [missCount, prevMissCount]);

  // Continuous subtle glitch effect when health is low
  useEffect(() => {
    if (health < 30) {
      const glitchLoop = setInterval(() => {
        setGlitch(prev => prev > 0 ? 0 : 0.3);
      }, 400 + Math.random() * 200);
      return () => clearInterval(glitchLoop);
    }
  }, [health]);

  // Calculate greyscale based on health
  const greyscaleIntensity = Math.max(0, (100 - health) / 100) * 0.8;
  
  // Calculate glitch opacity multiplier based on health (increases as health decreases below 80%)
  const glitchOpacityMultiplier = 1 + (Math.max(0, 160 - health) / 160) * 2; // 1x at 80% health (160), 3x at 0 health

  return (
    <>
      {/* Screen Shake Wrapper - applies to entire screen */}
      <motion.div
        className="fixed inset-0 z-50"
        style={{
          pointerEvents: shake > 0 ? 'auto' : 'none',
        }}
        animate={{
          x: shake > 0 ? (Math.random() - 0.5) * 16 : 0,
          y: shake > 0 ? (Math.random() - 0.5) * 16 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      />
      
      <div 
        className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
        style={{
          filter: `
            grayscale(${greyscaleIntensity})
            ${glitch > 0 ? `drop-shadow(${(Math.random() - 0.5) * 8}px ${(Math.random() - 0.5) * 8}px 0 rgb(255, 0, 127))` : ''}
            ${glitch > 0 ? `drop-shadow(${(Math.random() - 0.5) * 8}px ${(Math.random() - 0.5) * 8}px 0 rgb(0, 255, 255))` : ''}
          `
        }}
      >
        {/* Chromatic Aberration Effect */}
        <div
          className="absolute inset-0"
          style={{
            filter: chromatic > 0 ? `drop-shadow(${chromatic * 15}px 0 0 rgb(255, 0, 127)) drop-shadow(${-chromatic * 15}px 0 0 rgb(0, 255, 255))` : 'none',
          }}
        />

      {/* Glitch Effect Overlay - RGB scan lines */}
      {glitch > 0 && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(
              0deg,
              rgba(255, 0, 127, ${Math.min(glitch * 0.3 * glitchOpacityMultiplier, 1)}) 0%,
              transparent 2%,
              transparent 8%,
              rgba(0, 255, 255, ${Math.min(glitch * 0.3 * glitchOpacityMultiplier, 1)}) 10%,
              transparent 12%
            )`,
            backgroundSize: '100% 60px',
            backgroundPosition: `0 ${glitchPhase * 60}px`,
            animation: glitch > 0 ? `glitch-scroll ${0.1 + glitchPhase * 0.2}s linear infinite` : 'none',
          }}
        />
      )}

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
    </>
  );
}

// Add CSS for glitch animation
const style = document.createElement('style');
style.textContent = `
  @keyframes glitch-scroll {
    0% { background-position: 0 0; }
    100% { background-position: 0 60px; }
  }
`;
if (!document.querySelector('style[data-glitch]')) {
  style.setAttribute('data-glitch', 'true');
  document.head.appendChild(style);
}
