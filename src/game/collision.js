export function overlaps(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const radius = a.radius + b.radius;
  return dx * dx + dy * dy <= radius * radius;
}

export function createCaptureParticles(state, x, y, color = "#B8A7FF") {
  for (let i = 0; i < 24; i += 1) {
    const angle = (Math.PI * 2 * i) / 24;
    const speed = 70 + (i % 5) * 18;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 26,
      age: 0,
      life: 0.55 + (i % 4) * 0.08,
      size: 3 + (i % 3),
      color
    });
  }
}

export function createMissParticles(state, x, y) {
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x: x + Math.sin(i) * 14,
      y,
      vx: Math.sin(i * 1.7) * 20,
      vy: 22 + i * 3,
      age: 0,
      life: 0.45,
      size: 2 + (i % 2),
      color: "#FFD6F6"
    });
  }
}
