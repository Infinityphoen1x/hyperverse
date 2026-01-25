/**
 * Game input handling hook
 * Manages tap hits, hold start/end events, and deck rotation mapping
 */

import { useCallback } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import type { Note } from '@/types/game';
import { NoteProcessor } from '@/lib/notes/processors/noteProcessor';
import { NoteValidator } from '@/lib/notes/processors/noteValidator';
import { RotationManager } from '@/lib/managers/rotationManager';
import { GameErrors } from '@/lib/errors/errorLog';
import { audioManager } from '@/lib/audio/audioManager';
import { requiresRotation } from '@/lib/config/rotationConstants';
import { findRotatedLaneForDeck } from '@/lib/utils/laneRotationUtils';

interface UseGameInputProps {
  processor: NoteProcessor;
  validator: NoteValidator;
  rotationManager: RotationManager;
}

interface UseGameInputReturn {
  handleHitNote: (lane: number) => void;
  handleTrackHoldStart: (lane: number) => boolean;
  handleTrackHoldEnd: (lane: number) => void;
}

export function useGameInput({
  processor,
  validator,
  rotationManager,
}: UseGameInputProps): UseGameInputReturn {
  const setNotes = useGameStore(state => state.setNotes);
  const setScore = useGameStore(state => state.setScore);
  const setCombo = useGameStore(state => state.setCombo);
  const setHealth = useGameStore(state => state.setHealth);
  const setMissCount = useGameStore(state => state.setMissCount);
  const startDeckHold = useGameStore(state => state.startDeckHold);
  const endDeckHold = useGameStore(state => state.endDeckHold);

  const handleHitNote = useCallback((lane: number) => {
    const { notes, currentTime } = useGameStore.getState();
    
    // Lanes 0-3 are Taps
    if (lane >= 0 && lane <= 3) {
        const targetNote = validator.findClosestActiveNote(notes, lane, 'TAP', currentTime);
        
        if (targetNote) {
            console.log(`[GAME-ENGINE] Try hit note ${targetNote.id} at ${currentTime}ms (diff ${currentTime - targetNote.time}ms)`);
            
            // Re-read fresh state to prevent race condition on rapid double-press
            const freshNotes = useGameStore.getState().notes;
            const freshNote = freshNotes.find(n => n.id === targetNote.id);
            
            // Check if note was already processed by a previous rapid press
            if (!freshNote || !validator.isNoteActive(freshNote)) {
              console.log(`[GAME-ENGINE] Tap note ${targetNote.id} is no longer active, ignoring press`);
              return;
            }
            
            const result = processor.processTapHit(freshNote, currentTime);
            
            // Always persist the note update (success or failure)
            const updatedNotes = freshNotes.map(n => n.id === freshNote.id ? result.updatedNote : n);
            setNotes(updatedNotes);
            GameErrors.updateNoteStats(updatedNotes);
            
            if (result.success) {
                console.log(`[GAME-ENGINE] Hit success!`, result.scoreChange);
                audioManager.play('tapHit');
                
                if (result.scoreChange) {
                    setScore(result.scoreChange.score);
                    setCombo(result.scoreChange.combo);
                    setHealth(result.scoreChange.health);
                    if (result.scoreChange.missCount !== undefined) {
                        setMissCount(result.scoreChange.missCount);
                    }
                }
            } else {
                console.log(`[GAME-ENGINE] Hit failed - tapTooEarlyFailure: ${result.updatedNote.tapTooEarlyFailure}, tapMissFailure: ${result.updatedNote.tapMissFailure}`);
                
                if (result.scoreChange) {
                    setScore(result.scoreChange.score);
                    setCombo(result.scoreChange.combo);
                    setHealth(result.scoreChange.health);
                    if (result.scoreChange.missCount !== undefined) {
                        setMissCount(result.scoreChange.missCount);
                    }
                }
            }
        } else {
             console.log(`[GAME-ENGINE] No active note found in lane ${lane} at ${currentTime}`);
        }
    }
  }, [validator, processor, setNotes, setScore, setCombo, setHealth, setMissCount]);

  const handleTrackHoldStart = useCallback((lane: number): boolean => {
     const { notes, currentTime, tunnelRotation } = useGameStore.getState();
     
     // Try finding note on the pressed lane
     let targetNote = validator.findPressableHoldNote(notes, lane, currentTime);
     
     // If pressing a deck lane and no note found, check if a rotated lane is aligned with this deck
     if (!targetNote && (lane === -1 || lane === -2)) {
       const rotatedLane = findRotatedLaneForDeck(lane, tunnelRotation);
       if (rotatedLane !== null) {
         targetNote = validator.findPressableHoldNote(notes, rotatedLane, currentTime);
         console.log(`[GAME-ENGINE] Checking rotated lane ${rotatedLane} for deck ${lane}, found:`, !!targetNote);
       }
     }
     
     if (!targetNote) {
       return false; // No hold note found
     }
     
     // Re-read fresh state to prevent race condition on rapid double-press
     const freshNotes = useGameStore.getState().notes;
     const freshNote = freshNotes.find(n => n.id === targetNote.id);
     
     // Check if note was already processed by a previous rapid press
     if (!freshNote || !validator.isNoteActive(freshNote)) {
       console.log(`[GAME-ENGINE] Hold note ${targetNote.id} is no longer active, ignoring press`);
       return false;
     }
     
     const result = processor.processHoldStart(freshNote, currentTime);
     // Always persist the note update (success or failure)
     const updatedNotes = freshNotes.map(n => n.id === freshNote.id ? result.updatedNote : n);
     setNotes(updatedNotes);
     GameErrors.updateNoteStats(updatedNotes);
     
     if (result.success) {
         startDeckHold(lane);
         
         if (result.scoreChange) {
             setScore(result.scoreChange.score);
             setCombo(result.scoreChange.combo);
             setHealth(result.scoreChange.health);
             if (result.scoreChange.missCount !== undefined) {
                 setMissCount(result.scoreChange.missCount);
             }
         }
     } else {
         console.log(`[GAME-ENGINE] Hold start failed - tooEarlyFailure: ${result.updatedNote.tooEarlyFailure}, holdMissFailure: ${result.updatedNote.holdMissFailure}`);
         
         if (result.scoreChange) {
             setScore(result.scoreChange.score);
             setCombo(result.scoreChange.combo);
             setHealth(result.scoreChange.health);
             if (result.scoreChange.missCount !== undefined) {
                 setMissCount(result.scoreChange.missCount);
             }
         }
     }
     
     return true; // Hold note was found and processed
  }, [validator, processor, setNotes, setScore, setCombo, setHealth, setMissCount, startDeckHold]);

  const handleTrackHoldEnd = useCallback((lane: number) => {
     const { notes, currentTime, tunnelRotation } = useGameStore.getState();
     
     // Try finding note on the pressed lane
     let targetNote = validator.findActiveHoldNote(notes, lane, currentTime);
     
     // If releasing a deck lane and no note found, check if a rotated lane is aligned with this deck
     if (!targetNote && (lane === -1 || lane === -2)) {
       const rotatedLane = findRotatedLaneForDeck(lane, tunnelRotation);
       if (rotatedLane !== null) {
         targetNote = validator.findActiveHoldNote(notes, rotatedLane, currentTime);
         console.log(`[GAME-ENGINE] Checking rotated lane ${rotatedLane} for deck ${lane} release, found:`, !!targetNote);
       }
     }
     
     if (targetNote) {
         const result = processor.processHoldEnd(targetNote, currentTime);
         const updatedNotes = notes.map(n => n.id === targetNote.id ? result.updatedNote : n);
         setNotes(updatedNotes);
         GameErrors.updateNoteStats(updatedNotes);
         
         if (result.success) {
             audioManager.play('holdRelease');
         }
         
         if (result.scoreChange) {
             setScore(result.scoreChange.score);
             setCombo(result.scoreChange.combo);
             setHealth(result.scoreChange.health);
             if (result.scoreChange.missCount !== undefined) {
                 setMissCount(result.scoreChange.missCount);
             }
         }
         
         // Handle rotation reset on HOLD release
         if (requiresRotation(targetNote.lane)) {
             const setTunnelRotation = useGameStore.getState().setTunnelRotation;
             const currentTunnelRotation = useGameStore.getState().tunnelRotation;
             const shouldRotate = rotationManager.onHoldRelease(targetNote.id, currentTime, currentTunnelRotation);
             if (shouldRotate) {
                 const rotState = rotationManager.getState();
                 setTunnelRotation(rotState.targetAngle);
             }
         }
     }
     endDeckHold(lane);
  }, [validator, processor, rotationManager, setNotes, endDeckHold, setScore, setCombo, setHealth, setMissCount]);

  return {
    handleHitNote,
    handleTrackHoldStart,
    handleTrackHoldEnd,
  };
}
