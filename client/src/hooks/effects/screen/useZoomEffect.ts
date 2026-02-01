// src/hooks/useZoomEffect.ts
import { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';

// Module-level reset callback for global access (e.g., rewind)
let globalResetZoom: (() => void) | null = null;

export function resetZoomEffect() {
  if (globalResetZoom) {
    globalResetZoom();
  }
}

export interface ZoomEffectState {
  zoomIntensity: number;
  zoomRotation: number; // Gradual twist rotation (0° to +30°)
  zoomScale: number; // Gradual size increase (1.0 to 1.3)
  resetZoom: () => void; // Reset function for rewind
}

export function useZoomEffect(): ZoomEffectState {
  const notes = useGameStore(state => state.notes);
  const currentTime = useGameStore(state => state.currentTime);
  
  // Find active hold notes and calculate ZOOM state
  const zoomState = useMemo(() => {
    const activeHolds = notes.filter(n => 
      n.type === 'HOLD' &&
      n.pressHoldTime !== undefined &&
      n.pressHoldTime > 0 &&
      !n.hit &&
      !n.tooEarlyFailure &&
      !n.holdMissFailure &&
      !n.holdReleaseFailure
    );
    
    if (activeHolds.length < 2) {
      return { isActive: false, progress: 0 };
    }
    
    // Check if all holds have the same duration and start time (no staggered end)
    const firstHoldDuration = activeHolds[0].duration || 1000;
    const firstHoldTime = activeHolds[0].time;
    const allSameDuration = activeHolds.every(note => {
      const noteDuration = note.duration || 1000;
      const noteTime = note.time;
      // Check both duration and start time match (same end time)
      return Math.abs(noteDuration - firstHoldDuration) < 10 && 
             Math.abs(noteTime - firstHoldTime) < 10;
    });
    
    // Only activate ZOOM if holds have same end time (no staggered end)
    if (!allSameDuration) {
      return { isActive: false, progress: 0 };
    }
    
    // Calculate average progress toward release time
    // Progress = 0 at start, 1.0 at expected release time
    const progresses = activeHolds.map(note => {
      const holdDuration = note.duration || 1000;
      const elapsedFromNoteTime = currentTime - note.time;
      const progress = Math.min(Math.max(elapsedFromNoteTime / holdDuration, 0), 1);
      return progress;
    });
    
    // Use average progress of all active holds
    const avgProgress = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
    
    return { isActive: true, progress: avgProgress };
  }, [notes, currentTime]);
  
  // Smooth transition state with independent animation
  const [zoomIntensity, setZoomIntensity] = useState(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [currentScale, setCurrentScale] = useState(1.0);
  const animationFrameRef = useRef<number | null>(null);
  const fadeOutStartTime = useRef<number | null>(null);
  const fadeOutStartRotation = useRef(0);
  const fadeOutStartScale = useRef(1.0);
  const fadeOutStartIntensity = useRef(0);
  
  // Reset function for rewind
  const resetZoom = useCallback(() => {
    setZoomIntensity(0);
    setCurrentRotation(0);
    setCurrentScale(1.0);
    fadeOutStartTime.current = null;
  }, []);
  
  // Register global reset callback
  useEffect(() => {
    globalResetZoom = resetZoom;
    return () => {
      globalResetZoom = null;
    };
  }, [resetZoom]);
  
  // Smooth interpolation animation
  useEffect(() => {
    const maxRotation = 30; // degrees
    const maxScale = 1.3;
    const minScale = 1.0;
    const scaleRange = maxScale - minScale;
    
    const animate = () => {
      const currentZoomState = zoomState;
      
      if (currentZoomState.isActive) {
        // ZOOM is active: increase rotation/scale based on progress
        // Apply ease-out cubic curve: fast initially, then slow toward max
        const linearProgress = currentZoomState.progress;
        const easedProgress = 1 - Math.pow(1 - linearProgress, 3); // Ease-out cubic
        
        const targetRotation = easedProgress * maxRotation;
        const targetScale = minScale + (easedProgress * scaleRange);
        
        // Direct assignment for rotation and scale to match hold duration precisely
        setCurrentRotation(targetRotation);
        setCurrentScale(targetScale);
        
        // Only interpolate intensity for smooth fade-in
        setZoomIntensity(prev => {
          const target = 1.0;
          const diff = target - prev;
          return prev + diff * 0.2;
        });
        
        // Reset fade-out timer when zoom is active
        fadeOutStartTime.current = null;
      } else if (fadeOutStartTime.current !== null || currentRotation > 0.01 || currentScale > 1.001 || zoomIntensity > 0.01) {
        // ZOOM ended or not active: ease-out cubic fade back to neutral
        if (fadeOutStartTime.current === null) {
          // Initialize fade-out
          fadeOutStartTime.current = performance.now();
          fadeOutStartRotation.current = currentRotation;
          fadeOutStartScale.current = currentScale;
          fadeOutStartIntensity.current = zoomIntensity;
        }
        
        const elapsed = performance.now() - fadeOutStartTime.current;
        const fadeOutDuration = 600; // 600ms for smooth fade out
        const progress = Math.min(elapsed / fadeOutDuration, 1);
        
        // Ease-out cubic: fast initial fade, then slow
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        setCurrentRotation(fadeOutStartRotation.current * (1 - easedProgress));
        setCurrentScale(1.0 + (fadeOutStartScale.current - 1.0) * (1 - easedProgress));
        setZoomIntensity(fadeOutStartIntensity.current * (1 - easedProgress));
        
        if (progress >= 1) {
          setCurrentRotation(0);
          setCurrentScale(1.0);
          setZoomIntensity(0);
          fadeOutStartTime.current = null;
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [zoomState, currentRotation, currentScale, zoomIntensity]);
  
  return { 
    zoomIntensity: isFinite(zoomIntensity) ? zoomIntensity : 0, 
    zoomRotation: isFinite(currentRotation) ? currentRotation : 0, 
    zoomScale: isFinite(currentScale) ? currentScale : 1.0,
    resetZoom
  };
}
