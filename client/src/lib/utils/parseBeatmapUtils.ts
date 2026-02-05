// src/utils/parseBeatmap.ts
// Parses beatmap text files. Note: 'lane' field throughout represents position values (-2 to 3)
import { GameErrors } from '@/lib/errors/errorLog';

export interface BeatmapMetadata {
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  youtube?: string;
  beatmapStart?: number;
  beatmapEnd?: number;
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
    lane: number; // DEPRECATED: Represents position value (-2 to 3)
    type: 'TAP' | 'HOLD';
    duration?: number;
    holdId?: string;
    beatmapStart?: number;
    beatmapEnd?: number;
  }>;
}

export function parseBeatmap(text: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): ParsedBeatmap | null {
  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let metadata: BeatmapMetadata | null = null;
    let noteLines: string[] = [];

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
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].match(/^\[/)) break;
            if (lines[j]) noteLines.push(lines[j]);
          }
          break;
        }
      }

      if (inMetadata && line.includes(':')) {
        const parts = line.split(':');
        if (parts.length < 2) continue;

        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();

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
    if (!metadata.title || !metadata.artist || metadata.bpm <= 0 || metadata.duration <= 0) {
      GameErrors.log(`BeatmapParser: Invalid metadata - title: "${metadata?.title}", artist: "${metadata?.artist}", bpm: ${metadata?.bpm}, duration: ${metadata?.duration}`);
      return null;
    }

    const notes: ParsedBeatmap['notes'] = [];
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
      const lane = parseInt(parts[1]); // Position value (-2 to 3)
      const type = parts[2].toUpperCase();

      if (isNaN(time) || isNaN(lane)) {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} invalid time or position: time=${parts[0]}, position=${parts[1]}`);
        continue;
      }

      if (lane !== -2 && lane !== -1 && (lane < 0 || lane > 3)) {
        GameErrors.log(`BeatmapParser: Line ${lineIdx} invalid position ${lane}. Valid positions: -2 (P deck), -1 (Q deck), 0-3 (soundpads)`);
        continue;
      }

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

    const processedHoldIds = new Set<string>();
    for (const holdId in holdStarts) {
      if (!holdEnds[holdId]) {
        GameErrors.log(`BeatmapParser: HOLD_START "${holdId}" has no matching HOLD_END`);
        continue;
      }

      const start = holdStarts[holdId];
      const end = holdEnds[holdId];

      if (start.lane !== end.lane) {
        GameErrors.log(`BeatmapParser: HOLD "${holdId}" has mismatched positions: start position=${start.lane}, end position=${end.lane}`);
        continue;
      }

      if (end.time <= start.time) {
        GameErrors.log(`BeatmapParser: HOLD "${holdId}" has invalid timing: start=${start.time}, end=${end.time}`);
        continue;
      }

      const duration = end.time - start.time;
      notes.push({ time: start.time, lane: start.lane, type: 'HOLD', duration, holdId, beatmapStart: metadata.beatmapStart, beatmapEnd: metadata.beatmapEnd });
      processedHoldIds.add(holdId);
    }

    for (const holdId in holdEnds) {
      if (!holdStarts[holdId]) {
        GameErrors.log(`BeatmapParser: HOLD_END "${holdId}" has no matching HOLD_START`);
      }
    }

    return { metadata, notes };
  } catch (error) {
    GameErrors.log(`BeatmapParser: Beatmap parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}