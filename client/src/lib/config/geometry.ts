/**
 * Tunnel and note geometry constants
 * Viewport dimensions, hexagon radii, judgement zones, note rendering
 */

/**
 * 2D polar coordinate tunnel geometry for perspective rendering
 */
export interface TunnelGeometry {
  vanishingPointX: number;
  vanishingPointY: number;
  tunnelMaxDistance: number;
  tunnelContainerWidth: number;
  tunnelContainerHeight: number;
  judgementRadius: number;
  hexagonRadii: number[];
  rayAngles: number[];
  tapJudgementLineWidth: number;
  holdJudgementLineWidth: number;
}

export const TUNNEL_GEOMETRY: TunnelGeometry = {
  vanishingPointX: 350,
  vanishingPointY: 300,
  tunnelMaxDistance: 260,
  tunnelContainerWidth: 700,
  tunnelContainerHeight: 600,
  judgementRadius: 187,
  hexagonRadii: [22, 52, 89, 135, 187, 248],
  rayAngles: [0, 60, 120, 180, 240, 300],
  tapJudgementLineWidth: 35,
  holdJudgementLineWidth: 45,
};

export const RAY_ANGLES = TUNNEL_GEOMETRY.rayAngles;
export const TUNNEL_MAX_DISTANCE = TUNNEL_GEOMETRY.tunnelMaxDistance;
export const TAP_JUDGEMENT_LINE_WIDTH = TUNNEL_GEOMETRY.tapJudgementLineWidth;
export const JUDGEMENT_RADIUS = TUNNEL_GEOMETRY.judgementRadius;
export const HEXAGON_RADII = TUNNEL_GEOMETRY.hexagonRadii;
export const HOLD_JUDGEMENT_LINE_WIDTH = TUNNEL_GEOMETRY.holdJudgementLineWidth;

export interface TunnelViewport {
  vanishingPointX: number;
  vanishingPointY: number;
  containerWidth: number;
  containerHeight: number;
}

export const TUNNEL_VIEWPORT: TunnelViewport = {
  vanishingPointX: TUNNEL_GEOMETRY.vanishingPointX,
  vanishingPointY: TUNNEL_GEOMETRY.vanishingPointY,
  containerWidth: TUNNEL_GEOMETRY.tunnelContainerWidth,
  containerHeight: TUNNEL_GEOMETRY.tunnelContainerHeight,
};

export const VANISHING_POINT_X = TUNNEL_VIEWPORT.vanishingPointX;
export const VANISHING_POINT_Y = TUNNEL_VIEWPORT.vanishingPointY;
export const TUNNEL_CONTAINER_WIDTH = TUNNEL_VIEWPORT.containerWidth;
export const TUNNEL_CONTAINER_HEIGHT = TUNNEL_VIEWPORT.containerHeight;

/**
 * HOLD note visual geometry
 */
export interface HoldNoteGeometry {
  stripWidthMultiplier: number;
  failureAnimationDuration: number;
}

export const HOLD_NOTE_GEOMETRY: HoldNoteGeometry = {
  stripWidthMultiplier: 0.15,
  failureAnimationDuration: 1100,
};

export const HOLD_NOTE_STRIP_WIDTH_MULTIPLIER = HOLD_NOTE_GEOMETRY.stripWidthMultiplier;
export const FAILURE_ANIMATION_DURATION = HOLD_NOTE_GEOMETRY.failureAnimationDuration;

export const HOLD_OPACITY = {
  MIN_BASE: 0.4,
  MAX_PROGRESSION: 0.6,
} as const;

export const HOLD_STROKE = {
  BASE_WIDTH: 2,
  APPROACH_MULTIPLIER: 2,
  COLLAPSE_MULTIPLIER: 2,
} as const;

export const HOLD_GLOW = {
  MIN_SHADOW: 20,
  SHADOW_SCALE: 25,
  MIN_INNER_SHADOW: 12,
  INNER_SHADOW_SCALE: 15,
} as const;

export const HOLD_RAY = {
  SPREAD_ANGLE: 18,
} as const;

/**
 * TAP note visual geometry
 */
export interface TapNoteGeometry {
  renderWindowMs: number;
  fallthroughWindowMs: number;
}

export const TAP_NOTE_GEOMETRY: TapNoteGeometry = {
  renderWindowMs: 4000,
  fallthroughWindowMs: 200,
};

export const TAP_RENDER_WINDOW_MS = TAP_NOTE_GEOMETRY.renderWindowMs;
export const TAP_FALLTHROUGH_WINDOW_MS = TAP_NOTE_GEOMETRY.fallthroughWindowMs;

export const TAP_FAILURE_ANIMATIONS = {
  TOO_EARLY: { duration: 1200 },
  MISS: { duration: 1100 },
} as const;

export const TAP_HIT_FLASH = {
  DURATION: 600,
  FADE_START: 600,
  FADE_DURATION: 100,
} as const;

export const TAP_DEPTH = {
  MIN: 5,
  MAX: 15,
  FADE_TIME: 2000,
} as const;

export const TAP_RAY = {
  SPREAD_ANGLE: 8,
} as const;

export const TAP_OPACITY = {
  MIN_BASE: 0.4,
  MAX_PROGRESSION: 0.6,
  MIN_FADE: 0.1,
} as const;
