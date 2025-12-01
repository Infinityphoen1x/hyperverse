export function toggleGlitchState(state: number): number {
  return state === 0 ? 1 : 0;
}

export function createParticle(x: number, y: number, color: string) {
  return {
    id: `particle-${Date.now()}-${Math.random()}`,
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    life: 1,
    color,
    size: 4 + Math.random() * 8,
  };
}
