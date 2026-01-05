// Audio Manager for game sound effects
import difficultySettingsApplyWav from '../soundeffects/DifficultySettingsApply.wav';
import startSessionWav from '../soundeffects/StartSession.wav';
import pauseWav from '../soundeffects/Pause.wav';
import countdownWav from '../soundeffects/Countdown.wav';
import rewindWav from '../soundeffects/Rewind.wav';
import noteMissWav from '../soundeffects/NoteMiss.wav';
import tapHitWav from '../soundeffects/TapHit.wav';
import spinNoteWav from '../soundeffects/SpinNote.wav';
import holdReleaseWav from '../soundeffects/HoldRelease.wav';
import scoreWav from '../soundeffects/Score.wav';

export type SoundEffect = 
  | 'difficultySettingsApply'
  | 'startSession'
  | 'pause'
  | 'countdown'
  | 'rewind'
  | 'noteMiss'
  | 'tapHit'
  | 'spinNote'
  | 'holdRelease'
  | 'score';

interface AudioPool {
  sounds: HTMLAudioElement[];
  currentIndex: number;
}

class AudioManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private pools: Map<SoundEffect, AudioPool> = new Map();
  private volume: number = 0.7;
  private muted: boolean = false;
  private loaded: boolean = false;

  // Sounds that need pooling (frequently played)
  private readonly POOLED_SOUNDS: SoundEffect[] = ['tapHit', 'noteMiss'];
  private readonly POOL_SIZE = 5;

  async preload(): Promise<void> {
    if (this.loaded) return;

    const soundMap: Record<SoundEffect, string> = {
      difficultySettingsApply: difficultySettingsApplyWav,
      startSession: startSessionWav,
      pause: pauseWav,
      countdown: countdownWav,
      rewind: rewindWav,
      noteMiss: noteMissWav,
      tapHit: tapHitWav,
      spinNote: spinNoteWav,
      holdRelease: holdReleaseWav,
      score: scoreWav,
    };

    const loadPromises: Promise<void>[] = [];

    for (const [key, path] of Object.entries(soundMap)) {
      const soundKey = key as SoundEffect;
      
      if (this.POOLED_SOUNDS.includes(soundKey)) {
        // Create audio pool
        const pool: AudioPool = { sounds: [], currentIndex: 0 };
        
        for (let i = 0; i < this.POOL_SIZE; i++) {
          const audio = new Audio(path);
          audio.volume = this.volume;
          pool.sounds.push(audio);
          
          loadPromises.push(
            new Promise((resolve) => {
              audio.addEventListener('canplaythrough', () => resolve(), { once: true });
              audio.load();
            })
          );
        }
        
        this.pools.set(soundKey, pool);
      } else {
        // Single audio element
        const audio = new Audio(path);
        audio.volume = this.volume;
        this.sounds.set(soundKey, audio);
        
        loadPromises.push(
          new Promise((resolve) => {
            audio.addEventListener('canplaythrough', () => resolve(), { once: true });
            audio.load();
          })
        );
      }
    }

    await Promise.all(loadPromises);
    this.loaded = true;
    console.log('[AudioManager] All sound effects preloaded');
  }

  play(sound: SoundEffect): void {
    if (!this.loaded) {
      console.warn(`[AudioManager] Cannot play ${sound} - sounds not loaded yet`);
      return;
    }
    
    if (this.muted) {
      console.log(`[AudioManager] Skipping ${sound} - muted`);
      return;
    }

    try {
      // Check if sound uses pooling
      if (this.pools.has(sound)) {
        const pool = this.pools.get(sound)!;
        const audio = pool.sounds[pool.currentIndex];
        
        console.log(`[AudioManager] Playing ${sound} from pool (index ${pool.currentIndex})`);
        
        // Reset and play
        audio.currentTime = 0;
        audio.play().catch(err => console.warn(`[AudioManager] Play failed for ${sound}:`, err));
        
        // Move to next in pool
        pool.currentIndex = (pool.currentIndex + 1) % pool.sounds.length;
      } else {
        // Single audio element
        const audio = this.sounds.get(sound);
        if (audio) {
          console.log(`[AudioManager] Playing ${sound}`);
          audio.currentTime = 0;
          audio.play().catch(err => console.warn(`[AudioManager] Play failed for ${sound}:`, err));
        } else {
          console.warn(`[AudioManager] Sound ${sound} not found`);
        }
      }
    } catch (err) {
      console.warn(`[AudioManager] Error playing ${sound}:`, err);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update all audio elements
    this.sounds.forEach(audio => {
      audio.volume = this.volume;
    });
    
    this.pools.forEach(pool => {
      pool.sounds.forEach(audio => {
        audio.volume = this.volume;
      });
    });
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

// Singleton instance
export const audioManager = new AudioManager();
