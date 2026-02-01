import { create } from 'zustand';
import type { GameStoreState } from '@/types/game';
import { DEFAULT_BEATMAP_BPM } from '@/lib/config';
import { useShakeStore } from '@/stores/useShakeStore';
import { destroyYouTubePlayer } from '@/lib/youtube';
import { useBeatmapStore } from '@/stores/useBeatmapStore';

export const useGameStore = create<GameStoreState>((set, get) => ({
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
  soundVolume: 0.7, // Master volume for sound effects (0.0 to 1.0)
  soundMuted: false, // Master mute for sound effects
  tunnelRotation: 0, // Current tunnel rotation in degrees
  targetTunnelRotation: 0, // Target rotation for animation
  animatedTunnelRotation: 0, // Current animated rotation value (shared across all components)
  idleRotation: 0, // Idle sway animation angle
  spinPressCountPerLane: { '-1': 0, '-2': 0 }, // Track key presses per lane for spin alternation
  leftDeckSpinning: false, // Tracks if left deck is spinning due to hold note
  rightDeckSpinning: false, // Tracks if right deck is spinning due to hold note

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
  setPlayerSpeed: (speed) => set({ playerSpeed: Math.max(5, Math.min(40, speed)) }),
  setDefaultPlayerSpeed: (speed) => set({ defaultPlayerSpeed: Math.max(5, Math.min(40, speed)) }),
  setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
  setSoundMuted: (muted) => set({ soundMuted: muted }),
  setTunnelRotation: (angle) => set({ tunnelRotation: angle }),
  setTargetTunnelRotation: (angle) => set({ targetTunnelRotation: angle }),
  setAnimatedTunnelRotation: (angle) => set({ animatedTunnelRotation: angle }),
  setIdleRotation: (angle) => set({ idleRotation: angle }),
  incrementSpinPressCount: (lane: number) => set((state) => ({
    spinPressCountPerLane: {
      ...state.spinPressCountPerLane,
      [lane]: (state.spinPressCountPerLane[lane] ?? 0) + 1
    }
  })),
  setLeftDeckSpinning: (spinning) => set({ leftDeckSpinning: spinning }),
  setRightDeckSpinning: (spinning) => set({ rightDeckSpinning: spinning }),

  // Game actions
  hitNote: (lane) => {
    console.log(`[GAME] Hit note on lane ${lane}`);
  },
  hitPad: (lane) => {
    console.log(`[GAME] Hit pad on lane ${lane}`);
  },
  startDeckHold: (lane) => {
    console.log(`[GAME] Start deck hold on lane ${lane}`);
    // Start deck spinning when hold note is pressed
    if (lane === -1) {
      set({ leftDeckSpinning: true });
    } else if (lane === -2) {
      set({ rightDeckSpinning: true });
    }
  },
  endDeckHold: (lane) => {
    console.log(`[GAME] End deck hold on lane ${lane}`);
    // Stop deck spinning when hold note is released
    if (lane === -1) {
      set({ leftDeckSpinning: false });
    } else if (lane === -2) {
      set({ rightDeckSpinning: false });
    }
  },
  pauseGame: () => set({ isPaused: true, countdownSeconds: 0 }),
  resumeGame: () => set({ isPaused: false }),
  
  unloadBeatmap: () => {
    // Destroy YouTube player properly before clearing references
    destroyYouTubePlayer();

    useBeatmapStore.getState().clear();
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
      id: `${note.time}-${note.lane}-${idx}`, // Regenerate ID to ensure fresh objects
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
  getActiveNotesOnLane: (lane: number) => {
    return get().getVisibleNotes().filter(n => n.lane === lane);
  },
  isDead: () => {
    return get().health <= 0;
  },
}));
