export const VIEW_W = 1280;
export const VIEW_H = 720;

export function createInitialState(config) {
  const player = config.player;
  return {
    mode: "loading",
    elapsed: 0,
    spawnClock: 0,
    spawnIndex: 0,
    score: 0,
    catches: 0,
    missed: 0,
    combo: 0,
    lastCatchAt: -999,
    wind: { label: "calm", xForce: 0 },
    pointer: { active: false, x: player.start.x, y: player.start.y },
    input: { left: false, right: false, up: false, down: false },
    player: {
      x: player.start.x,
      y: player.start.y,
      vx: 0,
      vy: 0,
      radius: player.collision.radius,
      animation: "idle",
      animTime: 0,
      captureTimer: 0
    },
    jellyfish: [],
    particles: [],
    messages: [],
    assetsReady: false,
    muted: false
  };
}

export function resetRun(state, config) {
  const fresh = createInitialState(config);
  Object.assign(state, fresh, {
    mode: "playing",
    assetsReady: true
  });
}
