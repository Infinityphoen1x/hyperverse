import { GameDebugger } from './gameDebugTools';

// Create singleton debugger
const debugger_ = new GameDebugger(true);

// Mutable wrapper object for backward compatibility with old GameErrors API
export const GameErrors = {
  // Public mutable arrays
  notes: [] as string[],
  animations: [] as any[],
  noteStats: { total: 0, tap: 0, hold: 0, hit: 0, missed: 0, failed: 0, byLane: {} as Record<number, number> },
  renderStats: { rendered: 0, preMissed: 0 },
  hitStats: { successfulHits: 0, tapTooEarlyFailures: 0, tapMissFailures: 0, tooEarlyFailures: 0, holdMissFailures: 0, holdReleaseFailures: 0 },
  
  // Methods that update internal state
  log(msg: string) {
    debugger_.log(msg);
    // Update notes array from debugger
    this.notes = [...debugger_.getErrorLog()];
  },
  
  trackAnimation(noteId: string, type: any, failureTime?: number) {
    debugger_.trackAnimation(noteId, type, failureTime);
    // Update animations array from debugger
    this.animations = [...debugger_.getAnimationTracking()];
  },
  
  updateAnimation(noteId: string, updates: any) {
    debugger_.updateAnimation(noteId, updates);
    // Update animations array from debugger
    this.animations = [...debugger_.getAnimationTracking()];
  },
  
  updateNoteStats(notes: any[]) {
    debugger_.updateNoteStats(notes);
    // Update stats from debugger
    this.noteStats = debugger_.getNoteStats();
    this.hitStats = debugger_.getHitStats();
  },
  
  updateRenderStats(rendered: number, preMissed: number) {
    debugger_.updateRenderStats(rendered, preMissed);
    this.renderStats = debugger_.getRenderStats();
  },
  
  getAnimationStats() {
    return debugger_.getAnimationStats();
  },
};
