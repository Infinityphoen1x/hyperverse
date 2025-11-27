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
    let currentSection = '';
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
      
      if (line.match(/^\[EASY\]|\[MEDIUM\]|\[HARD\]/)) {
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
        const [key, value] = line.split(':').map(s => s.trim());
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
      console.error('Missing metadata or difficulty section');
      return null;
    }

    // Validate metadata has required values
    if (!metadata.title || !metadata.artist || metadata.bpm <= 0 || metadata.duration <= 0) {
      console.error('Invalid metadata: title, artist, bpm, and duration must be set and positive');
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
    
    for (const line of noteLines) {
      const parts = line.split('|');
      if (parts.length < 3) continue;
      
      const time = parseInt(parts[0]);
      const lane = parseInt(parts[1]);
      const type = parts[2].toUpperCase();
      
      if (isNaN(time) || isNaN(lane)) continue;
      
      if (type === 'TAP') {
        notes.push({ time, lane, type: 'TAP' });
      } else if (type === 'HOLD' && parts.length >= 5) {
        const duration = parseInt(parts[3]);
        const holdId = parts[4];
        
        if (!isNaN(duration)) {
          notes.push({ time, lane, type: 'HOLD', duration, holdId });
        }
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
