export const TAP_LINE_CONFIGS = [
  { lane: 0, angle: 120 },
  { lane: 1, angle: 60 },
  { lane: 2, angle: 300 },
  { lane: 3, angle: 240 },
];

export const HOLD_LINE_CONFIGS = [
  { lane: -1, angle: 180 },
  { lane: -2, angle: 0 },
];

export function calculateLinePoints(angle: number, distance: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x1: Math.cos(rad) * distance,
    y1: Math.sin(rad) * distance,
    x2: Math.cos(rad + Math.PI) * distance,
    y2: Math.sin(rad + Math.PI) * distance,
  };
}
