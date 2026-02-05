import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameStoreState } from '@/types/game';
import { DEFAULT_BEATMAP_BPM } from '@/lib/config';
import { useShakeStore } from '@/stores/useShakeStore';
import { destroyYouTubePlayer } from '@/lib/youtube';
import { useBeatmapStore } from '@/stores/useBeatmapStore';
import { useEditorStore } from '@/stores/useEditorStore';

export const useGameStore = create<GameStoreState>()(persist((set, get) => ({
  // Initial state
  gameState: 'IDLE',
  difficulty: 'MEDIUM',
  notes: [],
  currentTime: 0,
  isPaused: false,
  score: 0,
  combo: 0,
  health: 200,
  maxHealth: 200,
  missCount: 0,
  countdownSeconds: 0,
  beatmapBpm: DEFAULT_BEATMAP_BPM, // Default BPM - will be updated when beatmap loads
  playerSpeed: 20, // Temporary slider value in settings (5-40, higher = faster notes)
  defaultPlayerSpeed: 20, // Persisted default used in gameplay
  targetFPS: 60, // Target frame rate (30, 60, 120, 144, or 0 for unlimited)
  soundVolume: 0.7, // Master volume for sound effects (0.0 to 1.0)
  soundMuted: false, // Master mute for sound effects
  inputOffset: 0, // Audio/visual calibration offset in ms (-200 to +200)
  disableRotation: false, // Disable tunnel rotation (for tutorials)
  tunnelRotation: 0, // Current tunnel rotation in degrees
  targetTunnelRotation: 0, // Target rotation for animation
  animatedTunnelRotation: 0, // Current animated rotation value (shared across all components)
  idleRotation: 0, // Idle sway animation angle
  spinPressCountPerLane: { '-1': 0, '-2': 0 }, // Track key presses per position for spin alternation
  leftDeckSpinning: false, // Visual state: left deck wheel spinning (position -1 HOLD active)
  rightDeckSpinning: false, // Visual state: right deck wheel spinning (position -2 HOLD active)

  // Setters
  setGameState: (gameState) => set({ gameState }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setNotes: (notes) => set({ notes }),
  setScore: (score) => set({ score }),
  setCombo: (combo) => set({ combo }),
  setHealth: (health) => set({ health }),
  setMissCount: (missCount) => set({ missCount }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setIsPaused: (isPaused) => set({ isPaused }),
  setCountdownSeconds: (countdownSeconds) => set({ countdownSeconds }),
  setBeatmapBpm: (bpm) => set({ beatmapBpm: bpm }),
  setPlayerSpeed: (speed) => set({ playerSpeed: Math.max(5, Math.min(80, speed)) }),
  setDefaultPlayerSpeed: (speed) => set({ defaultPlayerSpeed: Math.max(5, Math.min(80, speed)) }),
  setTargetFPS: (fps) => set({ targetFPS: fps }),
  setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
  setSoundMuted: (muted) => set({ soundMuted: muted }),
  setInputOffset: (offset) => set({ inputOffset: Math.max(-200, Math.min(200, offset)) }),
  setDisableRotation: (disabled: boolean) => set({ disableRotation: disabled }),
  setTunnelRotation: (angle) => set({ tunnelRotation: angle }),
  setTargetTunnelRotation: (angle) => set({ targetTunnelRotation: angle }),
  setAnimatedTunnelRotation: (angle) => set({ animatedTunnelRotation: angle }),
  setIdleRotation: (angle) => set({ idleRotation: angle }),
  incrementSpinPressCount: (position: number) => set((state) => ({
    spinPressCountPerLane: {
      ...state.spinPressCountPerLane,
      [position]: (state.spinPressCountPerLane[position] ?? 0) + 1
    }
  })),
  setLeftDeckSpinning: (spinning) => set({ leftDeckSpinning: spinning }),
  setRightDeckSpinning: (spinning) => set({ rightDeckSpinning: spinning }),

  // Game actions
  hitNote: (position) => {
    // console.log(`[GAME] Hit note on position ${position}`);
  },
  hitPad: (position) => {
    // console.log(`[GAME] Hit pad on position ${position}`);
  },
  startDeckHold: (position) => {
    // console.log(`[GAME] Start hold on position ${position}`);
    // Update visual state: deck wheels spin when horizontal positions have active HOLD notes
    if (position === -1) {
      set({ leftDeckSpinning: true });
    } else if (position === -2) {
      set({ rightDeckSpinning: true });
    }
  },
  endDeckHold: (position) => {
    // console.log(`[GAME] End hold on position ${position}`);
    // Update visual state: stop deck wheel spinning when HOLD note ends
    if (position === -1) {
      set({ leftDeckSpinning: false });
    } else if (position === -2) {
      set({ rightDeckSpinning: false });
    }
  },
  pauseGame: () => set({ isPaused: true, countdownSeconds: 0 }),
  resumeGame: () => set({ isPaused: false }),
  
  unloadBeatmap: () => {
    // Destroy YouTube player properly before clearing references
    destroyYouTubePlayer();

    // Clear beatmap store (localStorage)
    useBeatmapStore.getState().clear();
    
    // Clear editor store
    useEditorStore.getState().clearBeatmapData();
    
    set({ 
      notes: [],
      currentTime: 0,
      score: 0,
      combo: 0,
      health: 200,
      missCount: 0,
      gameState: 'IDLE',
      isPaused: false,
      countdownSeconds: 0,
      beatmapBpm: DEFAULT_BEATMAP_BPM,
      spinPressCountPerLane: { '-1': 0, '-2': 0 }
    });
  },
  
  resetGameState: () => set((state) => ({ 
    // Reset note states but keep the notes array
    notes: state.notes.map(note => ({
      ...note,
      hit: false,
      missed: false,
      failureTime: undefined,
      pressHoldTime: undefined,
      releaseTime: undefined,
      tapTooEarlyFailure: false,
      tapMissFailure: false,
      tooEarlyFailure: false,
      holdMissFailure: false,
      holdReleaseFailure: false
    }))
  })),
  
  rewindGame: () => set((state) => ({ 
    currentTime: 0,
    spinPressCountPerLane: { '-1': 0, '-2': 0 }, // Reset spin alternation
    // Reset note states - create brand new objects to break stale references
    notes: state.notes.map((note, idx) => ({
      ...note,
      id: `${note.time}-${note.lane}-${idx}`, // DEPRECATED: note.lane field - Regenerate ID to ensure fresh objects
      hit: false,
      missed: false,
      failureTime: undefined,
      pressHoldTime: undefined,
      releaseTime: undefined,
      tapTooEarlyFailure: false,
      tapMissFailure: false,
      tooEarlyFailure: false,
      holdMissFailure: false,
      holdReleaseFailure: false
    }))
  })),
  
  restartGame: () => {
    // Reset visual effects
    useShakeStore.getState().resetShake();
    
    // Reset game state
    set((state) => ({ 
      currentTime: 0, 
      score: 0, 
      combo: 0, 
      health: 200,
      missCount: 0,
      gameState: 'IDLE', 
      isPaused: false,
      countdownSeconds: 0,
      tunnelRotation: 0,
      targetTunnelRotation: 0,
      animatedTunnelRotation: 0,
      playerSpeed: state.defaultPlayerSpeed, // Restore from persisted default
      spinPressCountPerLane: { '-1': 0, '-2': 0 }, // Reset spin alternation
      // Reset note states - create brand new objects to ensure all references are cleared
      notes: state.notes.map((note, idx) => ({
        ...note,
        id: `note-${idx}`, // Use same ID format as initial load
        hit: false,
        missed: false,
        failureTime: undefined,
        pressHoldTime: undefined,
        releaseTime: undefined,
        tapTooEarlyFailure: false,
        tapMissFailure: false,
        tooEarlyFailure: false,
        holdMissFailure: false,
        holdReleaseFailure: false
      }))
    }));
  },

  // Selectors
  getVisibleNotes: () => {
    const { notes, currentTime } = get();
    const leadTime = 2000;
    return notes.filter(n => n.time <= currentTime + leadTime && n.time >= currentTime - 500);
  },
  getProcessedTapNotes: () => {
    const { getVisibleNotes } = get();
    return getVisibleNotes().filter(n => n.type === 'TAP');
  },
  getHoldNotes: () => {
    const { getVisibleNotes } = get();
    return getVisibleNotes().filter(n => n.type === 'HOLD');
  },
  getActiveNotes: () => {
    return get().getVisibleNotes();
  },
  getCompletedNotes: () => {
    const { notes } = get();
    return notes.filter(n => n.hit || n.missed);
  },
  getActiveNotesOnPosition: (position: number) => {
    return get().getVisibleNotes().filter(n => n.lane === position); // DEPRECATED: note.lane field, treat as position
  },
  // Legacy export for backward compatibility
  getActiveNotesOnLane: (lane: number) => {
    return get().getVisibleNotes().filter(n => n.lane === lane); // DEPRECATED: note.lane field, treat as position
  },
  isDead: () => {
    return get().health <= 0;
  },
}), {
  name: 'game-settings',
  partialize: (state) => ({
    defaultPlayerSpeed: state.defaultPlayerSpeed,
    soundVolume: state.soundVolume,
    soundMuted: state.soundMuted,
    inputOffset: state.inputOffset,
  }),
  merge: (persistedState, currentState) => ({
    ...currentState,
    ...(persistedState as Partial<GameStoreState>),
  }),
}));
