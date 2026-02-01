import { useEffect } from 'react';
import { useVanishingPointStore } from '@/stores/useVanishingPointStore';
import { useEditorGraphicsStore } from '@/stores/useEditorGraphicsStore';

/**
 * Animation loop for editor visual effects
 * Handles vanishing point circular motion
 */
export function useEditorAnimation() {
  const setVPOffset = useVanishingPointStore(state => state.setVPOffset);
  const idleMotionEnabled = useEditorGraphicsStore(state => state.idleMotionEnabled);

  // Dynamic vanishing point: smooth circular motion for 3D perspective wobble
  useEffect(() => {
    // Only run if idle motion is enabled
    if (!idleMotionEnabled) {
      // Reset to center when disabled
      setVPOffset({ x: 0, y: 0 });
      return;
    }
    
    const VP_AMPLITUDE = 15; // ±15px offset from center
    const VP_CYCLE_DURATION = 8000; // 8 seconds per full cycle
    const VP_UPDATE_INTERVAL = 16; // ~60fps
    
    const intervalId = setInterval(() => {
      const elapsed = Date.now() % VP_CYCLE_DURATION;
      const progress = elapsed / VP_CYCLE_DURATION; // 0 to 1
      
      // Smooth circular motion using sine/cosine
      const angle = progress * Math.PI * 2; // 0 to 2π
      const x = Math.cos(angle) * VP_AMPLITUDE;
      const y = Math.sin(angle) * VP_AMPLITUDE;
      
      setVPOffset({ x, y });
    }, VP_UPDATE_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
      setVPOffset({ x: 0, y: 0 }); // Reset on unmount
    };
  }, [idleMotionEnabled, setVPOffset]);
}
