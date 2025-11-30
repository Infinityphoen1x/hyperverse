// src/hooks/useVanishingPointOffset.ts
import { useEffect, useState, useRef } from "react";
import {
  ANGLE_SHIFT_DISTANCE,
  ANGLE_SHIFT_DURATION,
} from '@/lib/utils/gameConstants';
import { GameErrors } from '@/lib/errors/errorLog';

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
  const vanishingPointShiftsRef = useRef<Array<{
    milestone: number;
    fromOffset: Offset;
    toOffset: Offset;
    distance: number;
  }>>([]);

  const validateVanishingPointShift = (
    milestone: number,
    prevOffset: Offset,
    newOffset: Offset
  ) => {
    const distance = Math.sqrt(
      Math.pow(newOffset.x - prevOffset.x, 2) + Math.pow(newOffset.y - prevOffset.y, 2)
    );
    const expectedDistance = ANGLE_SHIFT_DISTANCE;
    const tolerance = 0.5;

    const shiftRecord = {
      milestone,
      fromOffset: { ...prevOffset },
      toOffset: { ...newOffset },
      distance,
    };

    vanishingPointShiftsRef.current.push(shiftRecord);

    if (Math.abs(distance - expectedDistance) > tolerance) {
      console.warn(
        `[VP-ERROR] Milestone ${milestone}x: Shift distance ${distance.toFixed(2)}px exceeds expected ${expectedDistance}px`,
        shiftRecord
      );
    } else {
      console.log(
        `[VP-OK] Milestone ${milestone}x: Offset shifted by ${distance.toFixed(2)}px from [${prevOffset.x.toFixed(1)}, ${prevOffset.y.toFixed(1)}] to [${newOffset.x.toFixed(1)}, ${newOffset.y.toFixed(1)}]`
      );
    }

    return shiftRecord;
  };

  useEffect(() => {
    let animationFrameId: number;
    let lastAnimatedValues = { x: 0, y: 0 };
    let completionLogged = false;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - animationStartRef.current;

      if (elapsed < ANGLE_SHIFT_DURATION) {
        const progress = Math.min(elapsed / ANGLE_SHIFT_DURATION, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        const newX =
          currentOffsetRef.current.x +
          (targetOffsetRef.current.x - currentOffsetRef.current.x) * easeProgress;
        const newY =
          currentOffsetRef.current.y +
          (targetOffsetRef.current.y - currentOffsetRef.current.y) * easeProgress;

        lastAnimatedValues = { x: newX, y: newY };
        setVpOffset({ x: newX, y: newY });
        completionLogged = false;
      } else if (!completionLogged) {
        completionLogged = true;
        lastAnimatedValues = { ...targetOffsetRef.current };
        currentOffsetRef.current = { ...targetOffsetRef.current };
        console.log(
          `[VP-ANIM] Animation complete: currentRef now set to [${targetOffsetRef.current.x.toFixed(1)}, ${targetOffsetRef.current.y.toFixed(1)}]`
        );
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
        const currentAnimOffset = currentOffsetRef.current;
        const returnDistance = Math.sqrt(
          Math.pow(currentAnimOffset.x, 2) + Math.pow(currentAnimOffset.y, 2)
        );
        console.log(
          `[VP-RESET] x50 milestone: Returning to center from [${currentAnimOffset.x.toFixed(1)}, ${currentAnimOffset.y.toFixed(1)}] (distance: ${returnDistance.toFixed(2)}px)`
        );

        animationStartRef.current = Date.now();
        currentOffsetRef.current = { ...currentAnimOffset };
        targetOffsetRef.current = { x: 0, y: 0 };
      } else {
        const angle = Math.random() * Math.PI * 2;
        const newOffsetX = Math.cos(angle) * ANGLE_SHIFT_DISTANCE;
        const newOffsetY = Math.sin(angle) * ANGLE_SHIFT_DISTANCE;

        const currentAnimOffset = currentOffsetRef.current;

        validateVanishingPointShift(currentMilestone, currentAnimOffset, {
          x: newOffsetX,
          y: newOffsetY,
        });

        animationStartRef.current = Date.now();
        currentOffsetRef.current = { ...currentAnimOffset };
        targetOffsetRef.current = { x: newOffsetX, y: newOffsetY };
      }
    }
  }, [combo]);

  return vpOffset;
}