export function getHealthBasedRayColor(health: number): string {
  if (health > 150) return 'rgba(0, 255, 255, 0.5)'; // Cyan
  if (health > 50) return 'rgba(0, 255, 0, 0.5)';   // Green
  return 'rgba(255, 0, 0, 0.8)';                    // Red/Critical
}
