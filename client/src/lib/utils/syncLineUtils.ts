// src/lib/utils/syncLineUtils.ts
import { Note } from '@/lib/engine/gameTypes';
import { LEAD_TIME, JUDGEMENT_RADIUS, MAGIC_MS } from '@/lib/config';

/**
 * Sync threshold: notes within this many ms are considered synchronized
 */
export const SYNC_THRESHOLD_MS = 10;

/**
 * Represents a group of notes that are synchronized at a specific timestamp
 */
export interface SyncGroup {
  timestamp: number;
  noteIds: string[];
  radius: number;
  isVisible: boolean;
}

/**
 * Collects all relevant timestamps from notes (tap times, hold starts, hold ends)
 */
function collectTimestamps(notes: Note[]): Map<number, string[]> {
  const timestampMap = new Map<number, string[]>();
  
  for (const note of notes) {
    // Skip already hit tap notes or failed notes
    // For hold notes: skip only if released (has releaseTime) or failed, but not if just pressed
    const isHoldInProgress = note.type === 'HOLD' && note.pressHoldTime && !note.releaseTime && !note.hit;
    const shouldSkip = !isHoldInProgress && (
      note.hit || note.missed || note.tapTooEarlyFailure || note.tapMissFailure || 
      note.tooEarlyFailure || note.holdMissFailure || note.holdReleaseFailure
    );
    
    if (shouldSkip) {
      continue;
    }

    // Add note start time (applies to both TAP and HOLD)
    const startTime = note.time;
    if (!timestampMap.has(startTime)) {
      timestampMap.set(startTime, []);
    }
    timestampMap.get(startTime)!.push(`${note.id}-start`);

    // For HOLD notes, also add end time
    if (note.type === 'HOLD' && note.duration) {
      const endTime = note.time + note.duration;
      if (!timestampMap.has(endTime)) {
        timestampMap.set(endTime, []);
      }
      timestampMap.get(endTime)!.push(`${note.id}-end`);
    }
  }

  return timestampMap;
}

/**
 * Groups timestamps that are within SYNC_THRESHOLD_MS of each other
 */
function groupSyncedTimestamps(timestampMap: Map<number, string[]>): Map<number, string[]> {
  const timestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
  const syncedGroups = new Map<number, string[]>();

  let i = 0;
  while (i < timestamps.length) {
    const baseTime = timestamps[i];
    const group: string[] = [...timestampMap.get(baseTime)!];

    // Look ahead for timestamps within threshold
    let j = i + 1;
    while (j < timestamps.length && timestamps[j] - baseTime <= SYNC_THRESHOLD_MS) {
      group.push(...timestampMap.get(timestamps[j])!);
      j++;
    }

    // Only create sync group if 2+ notes are involved
    if (group.length >= 2) {
      syncedGroups.set(baseTime, group);
    }

    i = j;
  }

  return syncedGroups;
}

/**
 * Calculates the radius for a sync hexagon based on time until hit
 */
function calculateSyncRadius(timestamp: number, currentTime: number, effectiveLeadTime: number): number {
  const timeUntilHit = timestamp - currentTime;
  
  // Calculate progress from 0 (at vanishing point) to 1 (at judgment line)
  const progress = 1 - (timeUntilHit / effectiveLeadTime);
  
  // Clamp progress to valid range
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  // Map progress to radius (same formula as tap notes)
  const radius = 1 + (clampedProgress * (JUDGEMENT_RADIUS - 1));
  
  return radius;
}

/**
 * Detects synchronized notes and returns sync groups with their visual properties
 */
/**
 * Detect groups of synchronized notes and return hexagons to render
 * @param playerSpeed - Player speed setting (5-40, higher = faster notes)
 */
export function detectSyncGroups(notes: Note[], currentTime: number, playerSpeed: number = 20): SyncGroup[] {
  const timestampMap = collectTimestamps(notes);
  const syncedGroups = groupSyncedTimestamps(timestampMap);
  
  const syncGroups: SyncGroup[] = [];
  
  // MAGIC_MS formula: effectiveLeadTime = MAGIC_MS / playerSpeed
  const effectiveLeadTime = MAGIC_MS / playerSpeed;
  
  for (const [timestamp, noteIds] of Array.from(syncedGroups.entries())) {
    const timeUntilHit = timestamp - currentTime;
    
    // Only show sync lines for notes that are visible (within lead time window)
    // and haven't passed the judgment line yet
    const isVisible = timeUntilHit > 0 && timeUntilHit <= effectiveLeadTime;
    
    if (isVisible) {
      // Check if this sync group contains a hold note release
      // If so, position sync line at the hold note's far end position
      let radius: number;
      
      const hasHoldRelease = noteIds.some((id: string) => id.endsWith('-end'));
      if (hasHoldRelease) {
        // Find the hold note that's releasing at this timestamp
        const holdNoteId = noteIds.find((id: string) => id.endsWith('-end'))?.split('-')[0];
        const holdNote = notes.find(n => n.id === holdNoteId && n.type === 'HOLD');
        
        if (holdNote && holdNote.duration) {
          // Use dynamic depth mode calculation - far end based on release time
          const timeUntilRelease = (holdNote.time + holdNote.duration) - currentTime;
          const releaseProgress = 1 - (timeUntilRelease / effectiveLeadTime);
          const clampedReleaseProgress = Math.max(0, Math.min(1, releaseProgress));
          radius = 1 + (clampedReleaseProgress * (JUDGEMENT_RADIUS - 1));
        } else {
          // Fallback to standard calculation
          radius = calculateSyncRadius(timestamp, currentTime, effectiveLeadTime);
        }
      } else {
        // Standard calculation for tap notes and hold starts
        radius = calculateSyncRadius(timestamp, currentTime, effectiveLeadTime);
      }
      
      syncGroups.push({
        timestamp,
        noteIds,
        radius,
        isVisible,
      });
    }
  }
  
  return syncGroups;
}
