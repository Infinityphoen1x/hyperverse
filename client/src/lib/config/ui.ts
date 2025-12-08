/**
 * Deck and UI-specific constants
 * Deck rotation, hold meters, YouTube UI
 */

export interface DeckRotation {
  rotationSpeed: number;
  spinThreshold: number;
  dragVelocityThreshold: number;
}

export const DECK_ROTATION: DeckRotation = {
  rotationSpeed: 2.0,
  spinThreshold: 30,
  dragVelocityThreshold: 100,
};

export interface DeckWheelConfig {
  rotationSpeed: number;
  spinThreshold: number;
  dragVelocityThreshold: number;
}

export const DECK_WHEEL_CONFIG: DeckWheelConfig = {
  rotationSpeed: DECK_ROTATION.rotationSpeed,
  spinThreshold: DECK_ROTATION.spinThreshold,
  dragVelocityThreshold: DECK_ROTATION.dragVelocityThreshold,
};

export const ROTATION_SPEED = DECK_WHEEL_CONFIG.rotationSpeed;
export const SPIN_THRESHOLD = DECK_WHEEL_CONFIG.spinThreshold;
export const DRAG_VELOCITY_THRESHOLD = DECK_WHEEL_CONFIG.dragVelocityThreshold;

export interface DeckMeter {
  segments: number;
  segmentWidth: number;
  completionThreshold: number;
  completionGlowDuration: number;
  defaultHoldDuration: number;
}

export const DECK_METER: DeckMeter = {
  segments: 16,
  segmentWidth: 60,
  completionThreshold: 0.95,
  completionGlowDuration: 400,
  defaultHoldDuration: 1000,
};

export const DECK_METER_SEGMENTS = DECK_METER.segments;
export const DECK_METER_SEGMENT_WIDTH = DECK_METER.segmentWidth;
export const DECK_METER_COMPLETION_THRESHOLD = DECK_METER.completionThreshold;
export const DECK_METER_COMPLETION_GLOW_DURATION = DECK_METER.completionGlowDuration;
export const DECK_METER_DEFAULT_HOLD_DURATION = DECK_METER.defaultHoldDuration;

export interface YouTubeUI {
  labelButton: string;
  dialogTitle: string;
  inputLabel: string;
  inputPlaceholder: string;
  errorEmpty: string;
  errorInvalid: string;
  buttonLoad: string;
  buttonCancel: string;
  previewLabel: string;
  previewTitle: string;
  helpText: string;
}

export const YOUTUBE_UI: YouTubeUI = {
  labelButton: 'LOAD YOUTUBE',
  dialogTitle: 'LOAD YOUTUBE VIDEO',
  inputLabel: 'YouTube URL or Video ID',
  inputPlaceholder: 'https://youtube.com/watch?v=... or just the video ID',
  errorEmpty: 'Please enter a YouTube URL or video ID',
  errorInvalid: 'Invalid YouTube URL or video ID',
  buttonLoad: 'LOAD',
  buttonCancel: 'CANCEL',
  previewLabel: '▶ YouTube',
  previewTitle: 'YouTube video preview',
  helpText: 'The video will play silently in the background. Use its timing for gameplay sync.',
};

export interface YouTubeDimensions {
  previewWidth: number;
  previewHeight: number;
  previewOpacityDefault: number;
  previewOpacityHover: number;
  closeIconSize: number;
}

export const YOUTUBE_DIMENSIONS: YouTubeDimensions = {
  previewWidth: 256,
  previewHeight: 144,
  previewOpacityDefault: 0.1,
  previewOpacityHover: 0.2,
  closeIconSize: 14,
};

export interface YouTubeEmbedOptions {
  autoplay: boolean;
  controls: boolean;
  modestBranding: boolean;
  enableJsApi: boolean;
}

export const YOUTUBE_PREVIEW_EMBED_OPTIONS: YouTubeEmbedOptions = {
  autoplay: false,
  controls: false,
  modestBranding: true,
  enableJsApi: true
} as const;

export const YOUTUBE_BACKGROUND_EMBED_OPTIONS: YouTubeEmbedOptions = {
  autoplay: false,
  controls: false,
  modestBranding: true,
  enableJsApi: true
} as const;
