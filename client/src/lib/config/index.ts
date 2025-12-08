/**
 * Game Constants - Main Export
 * 
 * Refactored from single 739-line file into domain-specific modules:
 * - timing.ts - Hit windows, lead times, accuracy thresholds
 * - colors.ts - Lane colors, UI palette, particle colors
 * - geometry.ts - Tunnel viewport, note rendering, hexagons
 * - visual-effects.ts - Particles, shake, chromatic, glitch, health
 * - ui.ts - Deck meters, YouTube UI, embed options
 * - rotationConstants.ts - Tunnel rotation logic (already exists)
 * 
 * This file maintains backward compatibility by re-exporting all constants.
 */

// Timing exports
export * from './timing';

// Color exports  
export * from './colors';

// Geometry exports
export * from './geometry';

// Visual effects exports
export * from './visual-effects';

// UI exports
export * from './ui';

// Rotation constants (already separated)
export * from './rotationConstants';
