export function calculateButtonPosition(angle: number, vpX: number = 0, vpY: number = 0) {
  // Placeholder implementation - adjust based on actual game logic
  // Assuming angle is in radians or degrees, and vpX/vpY are viewport offsets
  const radius = 100; // Adjust radius
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.cos(radians) * radius + vpX,
    y: Math.sin(radians) * radius + vpY,
  };
}
