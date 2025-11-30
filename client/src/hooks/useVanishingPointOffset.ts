import { useEffect, useState, useRef } from "react";
import { ANGLE_SHIFT_DISTANCE, ANGLE_SHIFT_DURATION } from '@/lib/utils/gameConstants';

interface Offset {
  x: number;
  y: number;
}

export function useVanishingPointOffset(combo: number) {
  const [vpOffset, setVpOffset] = useState<Offset>({ x: 0, y: 0 });
  const prevComboMilestoneRef = useRef<number>(0);
  const animationStartRef = useRef<number>(Date.now() + ANGLE_SHIFT_DURATION);
  const targetOffsetRef = useRef<Offset>({ x: 0, y: 0 });
  const currentOffsetRef = useRef<Offset>({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId: number;
    let completionLogged = false;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - animationStartRef.current;

      if (elapsed < ANGLE_SHIFT_DURATION) {
        const progress = Math.min(elapsed / ANGLE_SHIFT_DURATION, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const newX = currentOffsetRef.current.x + (targetOffsetRef.current.x - currentOffsetRef.current.x) * easeProgress;
        const newY = currentOffsetRef.current.y + (targetOffsetRef.current.y - currentOffsetRef.current.y) * easeProgress;

        setVpOffset({ x: newX, y: newY });
        completionLogged = false;
      } else if (!completionLogged) {
        completionLogged = true;
        currentOffsetRef.current = { ...targetOffsetRef.current };
        setVpOffset({ x: targetOffsetRef.current.x, y: targetOffsetRef.current.y });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const currentMilestone = Math.floor(combo / 10) * 10;
    if (combo > 0 && currentMilestone !== prevComboMilestoneRef.current) {
      prevComboMilestoneRef.current = currentMilestone;

      if (currentMilestone % 50 === 0) {
        animationStartRef.current = Date.now();
        currentOffsetRef.current = { ...currentOffsetRef.current };
        targetOffsetRef.current = { x: 0, y: 0 };
      } else {
        const angle = Math.random() * Math.PI * 2;
        const newOffsetX = Math.cos(angle) * ANGLE_SHIFT_DISTANCE;
        const newOffsetY = Math.sin(angle) * ANGLE_SHIFT_DISTANCE;

        animationStartRef.current = Date.now();
        currentOffsetRef.current = { ...currentOffsetRef.current };
        targetOffsetRef.current = { x: newOffsetX, y: newOffsetY };
      }
    }
  }, [combo]);

  return vpOffset;
}
