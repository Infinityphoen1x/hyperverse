import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { GameErrors } from "@/lib/errorLog";
import {
  MAX_HEALTH,
  LOW_HEALTH_THRESHOLD,
  COMBO_MILESTONE,
  COMBO_PERFECT_MILESTONE,
  PARTICLES_PER_EFFECT,
  MAX_PARTICLES_BUFFER,
  PARTICLE_SIZE_MIN,
  PARTICLE_SIZE_MAX,
  SHAKE_INTERVAL,
  SHAKE_OFFSET_MULTIPLIER,
  SHAKE_DURATION,
  CHROMATIC_DURATION,
  CHROMATIC_INTENSITY,
  CHROMATIC_OFFSET_PX,
  GLITCH_BASE_INTERVAL,
  GLITCH_RANDOM_RANGE,
  GLITCH_OPACITY,
  GREYSCALE_INTENSITY,
  GLITCH_BACKGROUND_SIZE,
  PARTICLE_COLORS,
  COLOR_PARTICLE_GREEN,
  COLOR_PARTICLE_RED,
} from "@/lib/gameConstants";

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface VisualEffectsProps {
  combo: number;
  health?: number;
  missCount?: number;
}

export function VisualEffects({ combo, health = 100, missCount = 0 }: VisualEffectsProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shake, setShake] = useState(0);
  const [chromatic, setChromatic] = useState(0);
  const [glitch, setGlitch] = useState(0);
  const [glitchPhase, setGlitchPhase] = useState(0);
  const [prevMissCount, setPrevMissCount] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });
  const shakeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chromaticTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      if (chromaticTimeoutRef.current) clearTimeout(chromaticTimeoutRef.current);
    };
  }, []);

  // Helper function to toggle glitch state for clarity
  const toggleGlitchState = (prevGlitch: number): number => {
    return prevGlitch > 0 ? 0 : GLITCH_OPACITY;
  };

  // Initialize glitch animation CSS once on component mount
  useEffect(() => {
    const existingStyle = document.querySelector('style[data-glitch]');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes glitch-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 ${GLITCH_BACKGROUND_SIZE}px; }
        }
      `;
      style.setAttribute('data-glitch', 'true');
      document.head.appendChild(style);
    }
  }, []);

  // Add particles on combo milestones
  useEffect(() => {
    try {
      if (!Number.isFinite(combo) || combo < 0) {
        GameErrors.log(`VisualEffects: Invalid combo value ${combo}`);
        return;
      }
      
      if (combo > 0 && combo % COMBO_MILESTONE === 0) {
        const newParticles = Array.from({ length: PARTICLES_PER_EFFECT }, (_, i) => ({
          id: `${Date.now()}-${i}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
          size: Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN,
        }));
        
        setParticles(prev => [...prev, ...newParticles].slice(-MAX_PARTICLES_BUFFER));
        setShake(1);
        setChromatic(CHROMATIC_INTENSITY);
        
        // Start shake with random offsets that update at SHAKE_INTERVAL
        if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
        shakeIntervalRef.current = setInterval(() => {
          setShakeOffset({
            x: (Math.random() - 0.5) * SHAKE_OFFSET_MULTIPLIER,
            y: (Math.random() - 0.5) * SHAKE_OFFSET_MULTIPLIER,
          });
        }, SHAKE_INTERVAL);
        
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = setTimeout(() => {
          setShake(0);
          if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
          setShakeOffset({ x: 0, y: 0 });
        }, SHAKE_DURATION);
        
        if (chromaticTimeoutRef.current) clearTimeout(chromaticTimeoutRef.current);
        chromaticTimeoutRef.current = setTimeout(() => setChromatic(0), CHROMATIC_DURATION);
      }
    } catch (error) {
      GameErrors.log(`VisualEffects: Particle effect error at combo ${combo}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [combo]);

  // Trigger glitch effect on miss
  useEffect(() => {
    try {
      if (!Number.isFinite(missCount) || !Number.isFinite(prevMissCount)) {
        GameErrors.log(`VisualEffects: Invalid miss count values - missCount=${missCount}, prevMissCount=${prevMissCount}`);
        return;
      }
      
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
    } catch (error) {
      GameErrors.log(`VisualEffects: Glitch effect error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [missCount, prevMissCount]);

  // Continuous subtle glitch effect when health is low (below 80%)
  useEffect(() => {
    try {
      if (!Number.isFinite(health) || health < 0) {
        GameErrors.log(`VisualEffects: Invalid health value ${health}`);
        return;
      }
      
      if (health < LOW_HEALTH_THRESHOLD) {
        const glitchLoop = setInterval(() => {
          setGlitch(toggleGlitchState);
        }, GLITCH_BASE_INTERVAL + Math.random() * GLITCH_RANDOM_RANGE);
        glitchIntervalRef.current = glitchLoop;
        return () => {
          clearInterval(glitchLoop);
          glitchIntervalRef.current = null;
        };
      }
    } catch (error) {
      GameErrors.log(`VisualEffects: Health-based glitch loop error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [health]);

  // Calculate greyscale based on health (0-MAX_HEALTH range)
  const greyscaleIntensity = Math.max(0, (MAX_HEALTH - health) / MAX_HEALTH) * GREYSCALE_INTENSITY;
  
  // Calculate glitch opacity multiplier based on health (increases as health decreases below LOW_HEALTH_THRESHOLD)
  const glitchOpacityMultiplier = 1 + (Math.max(0, LOW_HEALTH_THRESHOLD - health) / LOW_HEALTH_THRESHOLD) * 2;

  return (
    <>
      {/* Screen Shake Wrapper - applies to entire screen */}
      <motion.div
        className="fixed inset-0 z-50"
        style={{
          pointerEvents: shake > 0 ? 'auto' : 'none',
        }}
        animate={{
          x: shakeOffset.x,
          y: shakeOffset.y,
        }}
        transition={{ type: 'tween', duration: 0.05 }}
      />
      
      <div 
        className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
        style={{
          filter: `grayscale(${greyscaleIntensity})`,
        }}
      >
        {/* Chromatic Aberration Effect */}
        <div
          className="absolute inset-0"
          style={{
            filter: chromatic > 0 ? `drop-shadow(${chromatic * CHROMATIC_OFFSET_PX}px 0 0 rgb(255, 0, 127)) drop-shadow(${-chromatic * CHROMATIC_OFFSET_PX}px 0 0 rgb(0, 255, 255))` : 'none',
          }}
        />

      {/* Glitch Effect Overlay - RGB scan lines */}
      {glitch > 0 && (
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(
              0deg,
              rgba(255, 0, 127, ${Math.min(glitch * GLITCH_OPACITY * glitchOpacityMultiplier, 1)}) 0%,
              transparent 2%,
              transparent 8%,
              rgba(0, 255, 255, ${Math.min(glitch * GLITCH_OPACITY * glitchOpacityMultiplier, 1)}) 10%,
              transparent 12%
            )`,
            backgroundSize: `100% ${GLITCH_BACKGROUND_SIZE}px`,
            backgroundPosition: `0 ${glitchPhase * GLITCH_BACKGROUND_SIZE}px`,
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
      {combo % COMBO_PERFECT_MILESTONE === 0 && combo > 0 && (
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
      )}
      </div>
    </>
  );
}
