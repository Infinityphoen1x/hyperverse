/**
 * Game input handling hook
 * Manages tap hits, hold start/end events, and position-to-rotation mapping
 * 
 * Note: "position" refers to absolute tunnel coordinates (-2 to 3)
 * - Positions -1, -2 are horizontal (fixed at 0°/180°)
 * - Positions 0-3 rotate during HOLD notes
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
  handleHitNote: (position: number) => void;
  handleTrackHoldStart: (position: number) => boolean;
  handleTrackHoldEnd: (position: number) => void;
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

  const handleHitNote = useCallback((position: number) => {
    const { notes, currentTime, tunnelRotation, playerSpeed } = useGameStore.getState();
    
    console.log(`[HIT-NOTE] Position ${position} pressed at ${currentTime}ms, tunnelRotation: ${tunnelRotation}°`);
    
    // Calculate effective lead time for dynamic windows
    const effectiveLeadTime = 80000 / playerSpeed; // MAGIC_MS / playerSpeed
    
    // Find pressable TAP note at this position (works for all positions: 0-3, -1, -2)
    const targetNote = validator.findPressableTapNote(notes, position, currentTime, effectiveLeadTime);
    
    // Debug: Show all notes at this position
    const positionNotes = notes.filter(n => n.lane === position && n.type === 'TAP' && !n.missed && !n.hit);
    console.log(`[HIT-NOTE] Position ${position} - available notes:`, positionNotes.map(n => `${n.id} at ${n.time}ms`));
    console.log(`[HIT-NOTE] Position ${position} - targetNote:`, targetNote ? `${targetNote.id} at ${targetNote.time}ms` : 'null');
    
    if (targetNote) {
            // console.log(`[GAME-ENGINE] Try hit note ${targetNote.id} at ${currentTime}ms (diff ${currentTime - targetNote.time}ms)`);
            
            // Re-read fresh state to prevent race condition on rapid double-press
            const freshNotes = useGameStore.getState().notes;
            const freshNote = freshNotes.find(n => n.id === targetNote.id);
            
            // Check if note was already processed by a previous rapid press
            if (!freshNote || !validator.isNoteActive(freshNote)) {
              // console.log(`[GAME-ENGINE] Tap note ${targetNote.id} is no longer active, ignoring press`);
              return;
            }
            
            const result = processor.processTapHit(freshNote, currentTime);
            
            // Always persist the note update (success or failure)
            const updatedNotes = freshNotes.map(n => n.id === freshNote.id ? result.updatedNote : n);
            setNotes(updatedNotes);
            GameErrors.updateNoteStats(updatedNotes);
            
            if (result.success) {
                // console.log(`[GAME-ENGINE] Hit success!`, result.scoreChange);
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
                // console.log(`[GAME-ENGINE] Hit failed - tapTooEarlyFailure: ${result.updatedNote.tapTooEarlyFailure}, tapMissFailure: ${result.updatedNote.tapMissFailure}`);
                
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
             console.log(`[GAME-ENGINE] No active TAP note found at position ${position} at ${currentTime}`);
        }
  }, [validator, processor, setNotes, setScore, setCombo, setHealth, setMissCount]);

  const handleTrackHoldStart = useCallback((position: number): boolean => {
     const { notes, currentTime, tunnelRotation, playerSpeed } = useGameStore.getState();
     
     // Calculate effective lead time for dynamic windows
     const effectiveLeadTime = 80000 / playerSpeed; // MAGIC_MS / playerSpeed
     
     console.log(`[HOLD-START] Position ${position} pressed at ${currentTime}ms`);
     
     // Try finding note at the pressed position
     let targetNote = validator.findPressableHoldNote(notes, position, currentTime, effectiveLeadTime);
     
     console.log(`[HOLD-START] Found note at position ${position}:`, targetNote ? { id: targetNote.id, time: targetNote.time, lane: targetNote.lane } : 'NONE');
     
     // If pressing a horizontal position (-1/-2) and no note found, check if a rotated position is aligned
     if (!targetNote && (position === -1 || position === -2)) {
       const rotatedLane = findRotatedLaneForDeck(position, tunnelRotation);
       if (rotatedLane !== null) {
         targetNote = validator.findPressableHoldNote(notes, rotatedLane, currentTime, effectiveLeadTime);
         console.log(`[HOLD-START] Checking rotated position ${rotatedLane} for horizontal position ${position}, found:`, !!targetNote);
       }
     }
     
     if (!targetNote) {
       console.log(`[HOLD-START] No hold note found at position ${position}`);
       return false; // No hold note found
     }
     
     // Re-read fresh state to prevent race condition on rapid double-press
     const freshNotes = useGameStore.getState().notes;
     const freshNote = freshNotes.find(n => n.id === targetNote.id);
     
     // Check if note was already processed by a previous rapid press
     if (!freshNote || !validator.isNoteActive(freshNote)) {
       // console.log(`[GAME-ENGINE] Hold note ${targetNote.id} is no longer active, ignoring press`);
       return false;
     }
     
     const result = processor.processHoldStart(freshNote, currentTime);
     // Always persist the note update (success or failure)
     const updatedNotes = freshNotes.map(n => n.id === freshNote.id ? result.updatedNote : n);
     setNotes(updatedNotes);
     GameErrors.updateNoteStats(updatedNotes);
     
     console.log(`[HOLD-START] Processed hold start for note ${freshNote.id}, success: ${result.success}, pressHoldTime: ${result.updatedNote.pressHoldTime}`);
     
     if (result.success) {
         // Play sound effect on successful hold press
         audioManager.play('tapHit');
         startDeckHold(position);
         
         if (result.scoreChange) {
             setScore(result.scoreChange.score);
             setCombo(result.scoreChange.combo);
             setHealth(result.scoreChange.health);
             if (result.scoreChange.missCount !== undefined) {
                 setMissCount(result.scoreChange.missCount);
             }
         }
     } else {
         // console.log(`[GAME-ENGINE] Hold start failed - tooEarlyFailure: ${result.updatedNote.tooEarlyFailure}, holdMissFailure: ${result.updatedNote.holdMissFailure}`);
         
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

  const handleTrackHoldEnd = useCallback((position: number) => {
     const { notes, currentTime, tunnelRotation } = useGameStore.getState();
     
     // Try finding note at the released position
     let targetNote = validator.findActiveHoldNote(notes, position, currentTime);
     
     // If releasing a horizontal position (-1/-2) and no note found, check if a rotated position is aligned
     if (!targetNote && (position === -1 || position === -2)) {
       const rotatedLane = findRotatedLaneForDeck(position, tunnelRotation);
       if (rotatedLane !== null) {
         targetNote = validator.findActiveHoldNote(notes, rotatedLane, currentTime);
         // console.log(`[GAME-ENGINE] Checking rotated position ${rotatedLane} for horizontal position ${position} release, found:`, !!targetNote);
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
     endDeckHold(position);
  }, [validator, processor, rotationManager, setNotes, endDeckHold, setScore, setCombo, setHealth, setMissCount]);

  return {
    handleHitNote,
    handleTrackHoldStart,
    handleTrackHoldEnd,
  };
}
