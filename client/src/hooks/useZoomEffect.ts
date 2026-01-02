// src/hooks/useZoomEffect.ts
import { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '@/stores/useGameStore';

export interface ZoomEffectState {
  zoomIntensity: number;
  zoomRotation: number; // Gradual twist rotation (0° to +30°)
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
  
  // Smooth zoom intensity with spring-like transition
  const [zoomIntensity, setZoomIntensity] = useState(0);
  
  useEffect(() => {
    const targetZoom = zoomState.isActive ? 1.0 : 0;
    
    if (targetZoom !== zoomIntensity) {
      // Smooth transition over ~300ms
      const transitionDuration = 300; // ms
      const startTime = performance.now();
      const startZoom = zoomIntensity;
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / transitionDuration, 1);
        
        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const newZoom = startZoom + (targetZoom - startZoom) * eased;
        
        setZoomIntensity(newZoom);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [zoomState.isActive]);
  
  // Gradual twist: 0° at start → +30° at release time
  const zoomRotation = useMemo(() => {
    if (zoomIntensity === 0) return 0;
    
    // Map progress (0 to 1) to rotation (0° to +30°)
    // Scale by zoomIntensity for smooth fade in/out
    const maxRotation = 30; // degrees
    const rotation = zoomState.progress * maxRotation * zoomIntensity;
    
    return rotation;
  }, [zoomState.progress, zoomIntensity]);
  
  return { zoomIntensity, zoomRotation };
}
