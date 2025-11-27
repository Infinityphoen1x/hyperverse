import { GameErrors } from '@/lib/gameEngine';

export interface BeatmapMetadata {
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  youtube?: string;
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
    
    // Parse note lines
    const notes: Array<{
      time: number;
      lane: number;
      type: 'TAP' | 'HOLD';
      duration?: number;
      holdId?: string;
    }> = [];
    
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
      
      if (type === 'TAP') {
        notes.push({ time, lane, type: 'TAP' });
      } else if (type === 'HOLD') {
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
        
        notes.push({ time, lane, type: 'HOLD', duration, holdId });
      } else if (type !== 'TAP' && type !== 'HOLD') {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} unknown note type: "${type}"`);
      }
    }
    
    return {
      metadata,
      notes,
    };
  } catch (error) {
    console.error('Beatmap parse error:', error);
    return null;
  }
}
