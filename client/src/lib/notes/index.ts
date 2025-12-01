export type { NoteUpdateResult } from './config/types';

// TAP note processors
export { getTapNoteState, shouldRenderTapNote, trackTapNoteAnimation } from './tap/tapNoteHelpers';
export * from './tap/tapNoteStyle';

// HOLD note processors  
export { getHoldNoteFailureStates, markAnimationCompletedIfDone, trackHoldNoteAnimationLifecycle } from './hold/holdNoteHelpers';
export * from './hold/holdGreystate';
export * from './hold/holdNoteStyle';

// Main processors
export { NoteProcessor } from './processors/noteProcessor';
export { NoteValidator } from './processors/noteValidator';
export * from './processors/noteUpdateHelpers';
export * from './processors/noteAutoFailHelpers';
