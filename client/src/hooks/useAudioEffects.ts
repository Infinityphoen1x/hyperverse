// Hook to integrate audio manager with game events
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { audioManager } from '@/lib/audio/audioManager';

export function useAudioEffects() {
  const missCount = useGameStore(state => state.missCount);
  const combo = useGameStore(state => state.combo);
  const soundVolume = useGameStore(state => state.soundVolume);
  const soundMuted = useGameStore(state => state.soundMuted);
  
  const previousMissCount = useRef(missCount);
  const previousCombo = useRef(combo);

  // Sync volume and mute settings
  useEffect(() => {
    audioManager.setVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    audioManager.setMuted(soundMuted);
  }, [soundMuted]);

  // Play miss sound when miss count increases
  useEffect(() => {
    if (missCount > previousMissCount.current) {
      audioManager.play('noteMiss');
    }
    previousMissCount.current = missCount;
  }, [missCount]);

  // Play score milestone sound for combo multiples of 10
  useEffect(() => {
    if (combo > 0 && combo % 10 === 0 && combo !== previousCombo.current) {
      audioManager.play('score');
    }
    previousCombo.current = combo;
  }, [combo]);
}

// Standalone functions for explicit sound triggers
export function playTapHitSound() {
  audioManager.play('tapHit');
}

export function playHoldReleaseSound() {
  audioManager.play('holdRelease');
}

export function playSpinNoteSound() {
  audioManager.play('spinNote');
}

export function playPauseSound() {
  audioManager.play('pause');
}

export function playRewindSound() {
  audioManager.play('rewind');
}

export function playCountdownSound() {
  audioManager.play('countdown');
}

export function playStartSessionSound() {
  audioManager.play('startSession');
}

export function playSettingsApplySound() {
  audioManager.play('difficultySettingsApply');
}
