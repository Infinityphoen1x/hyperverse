import { GameErrors } from '@/lib/errorLog';

export interface BeatmapMetadata {
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  youtube?: string;
  beatmapStart?: number; // ms - when notes start appearing
  beatmapEnd?: number; // ms - when notes stop appearing
}

export interface BeatmapData {
  metadata: BeatmapMetadata;
  difficulties: {
    EASY?: string[];
    MEDIUM?: string[];
    HARD?: string[];
  };
}

export interface ParsedBeatmap {
  metadata: BeatmapMetadata;
  notes: Array<{
    time: number;
    lane: number;
    type: 'TAP' | 'HOLD';
    duration?: number;
    holdId?: string;
    beatmapStart?: number; // Inherited from metadata
    beatmapEnd?: number; // Inherited from metadata
  }>;
}

export function parseBeatmap(text: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): ParsedBeatmap | null {
  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let metadata: BeatmapMetadata | null = null;
    let noteLines: string[] = [];
    
    // Parse metadata and find the requested difficulty section
    let inMetadata = false;
    let foundDifficulty = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line === '[METADATA]') {
        inMetadata = true;
        continue;
      }
      
      if (line.match(/^\[(EASY|MEDIUM|HARD)\]$/)) {
        inMetadata = false;
        const sectionDifficulty = line.replace(/[\[\]]/g, '');
        
        if (sectionDifficulty === difficulty) {
          foundDifficulty = true;
          // Collect all note lines until next section or end
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].match(/^\[/)) break; // Next section
            if (lines[j]) noteLines.push(lines[j]);
          }
          break;
        }
      }
      
      if (inMetadata && line.includes(':')) {
        const parts = line.split(':');
        if (parts.length < 2) continue; // Skip malformed lines
        
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim(); // Handle values with colons
        
        if (!metadata) metadata = { title: '', artist: '', bpm: 0, duration: 0 };
        
        if (key.toLowerCase() === 'title') metadata.title = value;
        if (key.toLowerCase() === 'artist') metadata.artist = value;
        if (key.toLowerCase() === 'bpm') {
          const bpm = parseInt(value);
          if (!isNaN(bpm)) metadata.bpm = bpm;
        }
        if (key.toLowerCase() === 'duration') {
          const dur = parseInt(value);
          if (!isNaN(dur)) metadata.duration = dur;
        }
        if (key.toLowerCase() === 'youtube') metadata.youtube = value;
        if (key.toLowerCase() === 'beatmapstart') {
          const start = parseInt(value);
          if (!isNaN(start)) metadata.beatmapStart = start;
        }
        if (key.toLowerCase() === 'beatmapend') {
          const end = parseInt(value);
          if (!isNaN(end)) metadata.beatmapEnd = end;
        }
      }
    }
    
    if (!metadata || !foundDifficulty) {
      GameErrors.log(`BeatmapParser: Missing metadata or ${difficulty} difficulty section`);
      return null;
    }

    // Validate metadata has required values
    if (!metadata.title || !metadata.artist || metadata.bpm <= 0 || metadata.duration <= 0) {
      GameErrors.log(`BeatmapParser: Invalid metadata - title: "${metadata?.title}", artist: "${metadata?.artist}", bpm: ${metadata?.bpm}, duration: ${metadata?.duration}`);
      return null;
    }
    
    // Parse note lines - supports both old (duration-based) and new (start/end) HOLD formats
    const notes: Array<{
      time: number;
      lane: number;
      type: 'TAP' | 'HOLD';
      duration?: number;
      holdId?: string;
      beatmapStart?: number;
      beatmapEnd?: number;
    }> = [];
    
    // First pass: collect all HOLD_START and HOLD_END points
    const holdStarts: Record<string, { time: number; lane: number }> = {};
    const holdEnds: Record<string, { time: number; lane: number }> = {};
    
    for (let lineIdx = 0; lineIdx < noteLines.length; lineIdx++) {
      const line = noteLines[lineIdx];
      const parts = line.split('|');
      if (parts.length < 3) {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} has insufficient fields: "${line}"`);
        continue;
      }
      
      const time = parseInt(parts[0]);
      const lane = parseInt(parts[1]);
      const type = parts[2].toUpperCase();
      
      if (isNaN(time) || isNaN(lane)) {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} invalid time or lane: time=${parts[0]}, lane=${parts[1]}`);
        continue;
      }
      
      // Validate lane is in valid range: -2, -1 (deck), or 0-3 (soundpads)
      if (lane !== -2 && lane !== -1 && (lane < 0 || lane > 3)) {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} invalid lane ${lane}. Valid lanes: -2 (P deck), -1 (Q deck), 0-3 (soundpads)`);
        continue;
      }
      
      // Handle new start/end format
      if (type === 'HOLD_START') {
        if (parts.length < 4) {
          GameErrors.log(`BeatmapParser: HOLD_START line ${lineIdx} missing holdId: "${line}"`);
          continue;
        }
        const holdId = parts[3].trim();
        if (!holdId) {
          GameErrors.log(`BeatmapParser: HOLD_START line ${lineIdx} missing holdId`);
          continue;
        }
        holdStarts[holdId] = { time, lane };
      } else if (type === 'HOLD_END') {
        if (parts.length < 4) {
          GameErrors.log(`BeatmapParser: HOLD_END line ${lineIdx} missing holdId: "${line}"`);
          continue;
        }
        const holdId = parts[3].trim();
        if (!holdId) {
          GameErrors.log(`BeatmapParser: HOLD_END line ${lineIdx} missing holdId`);
          continue;
        }
        holdEnds[holdId] = { time, lane };
      } else if (type === 'TAP') {
        notes.push({ time, lane, type: 'TAP', beatmapStart: metadata.beatmapStart, beatmapEnd: metadata.beatmapEnd });
      } else if (type === 'HOLD') {
        // Old single-line HOLD format (backward compatibility)
        if (parts.length < 5) {
          GameErrors.log(`BeatmapParser: HOLD note line ${lineIdx} missing duration or holdId: "${line}"`);
          continue;
        }
        const duration = parseInt(parts[3]);
        const holdId = parts[4].trim();
        
        if (isNaN(duration)) {
          GameErrors.log(`BeatmapParser: HOLD note line ${lineIdx} invalid duration: "${parts[3]}"`);
          continue;
        }
        if (!holdId) {
          GameErrors.log(`BeatmapParser: HOLD note line ${lineIdx} missing holdId`);
          continue;
        }
        
        notes.push({ time, lane, type: 'HOLD', duration, holdId, beatmapStart: metadata.beatmapStart, beatmapEnd: metadata.beatmapEnd });
      } else if (type !== 'TAP' && type !== 'HOLD' && type !== 'HOLD_START' && type !== 'HOLD_END') {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} unknown note type: "${type}"`);
      }
    }
    
    // Second pass: convert HOLD_START/HOLD_END pairs to HOLD notes
    const processedHoldIds = new Set<string>();
    
    for (const holdId in holdStarts) {
      if (!holdEnds[holdId]) {
        GameErrors.log(`BeatmapParser: HOLD_START "${holdId}" has no matching HOLD_END`);
        continue;
      }
      
      const start = holdStarts[holdId];
      const end = holdEnds[holdId];
      
      // Validate start and end are on same lane
      if (start.lane !== end.lane) {
        GameErrors.log(`BeatmapParser: HOLD "${holdId}" has mismatched lanes: start lane=${start.lane}, end lane=${end.lane}`);
        continue;
      }
      
      // Validate end time is after start time
      if (end.time <= start.time) {
        GameErrors.log(`BeatmapParser: HOLD "${holdId}" has invalid timing: start=${start.time}, end=${end.time}`);
        continue;
      }
      
      const duration = end.time - start.time;
      notes.push({ time: start.time, lane: start.lane, type: 'HOLD', duration, holdId, beatmapStart: metadata.beatmapStart, beatmapEnd: metadata.beatmapEnd });
      processedHoldIds.add(holdId);
    }
    
    // Check for orphaned HOLD_END entries (HOLD_END without HOLD_START)
    for (const holdId in holdEnds) {
      if (!holdStarts[holdId]) {
        GameErrors.log(`BeatmapParser: HOLD_END "${holdId}" has no matching HOLD_START`);
      }
    }
    
    return {
      metadata,
      notes,
    };
  } catch (error) {
    GameErrors.log(`BeatmapParser: Beatmap parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}
