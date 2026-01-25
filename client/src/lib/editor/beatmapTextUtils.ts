/**
 * Beatmap text parsing and generation utilities
 * 
 * This file re-exports from the split modules for backward compatibility.
 * New code should import directly from:
 * - beatmapParser.ts - for parsing text to notes
 * - beatmapGenerator.ts - for generating text from notes
 * - beatmapValidator.ts - for validation functions
 */

// Re-export parser functions and types
export {
  parseBeatmapText,
  parseBeatmapTextWithDifficulties,
  parseMetadataFromText,
  type BeatmapMetadata,
  type Difficulty,
  type DifficultyNotes,
} from './beatmapParser';

// Re-export generator functions
export {
  generateBeatmapText,
  generateBeatmapTextWithDifficulties,
} from './beatmapGenerator';

// Re-export validator functions and types
export {
  validateNote,
  validateBeatmap,
  findOverlappingNotes,
  type ValidationIssue,
} from './beatmapValidator';

