import { VIEW_H, VIEW_W } from "./state.js";

export function getWind(level, elapsed) {
  return level.windPhases.find((phase) => elapsed >= phase.timeStart && elapsed < phase.timeEnd) ?? level.windPhases[0];
}

export function chooseSpawn(level, enemies, elapsed, spawnIndex) {
  const active = level.jellyfishSpawns.filter((entry) => elapsed >= entry.timeStart && elapsed < entry.timeEnd);
  const pool = active.length ? active : level.jellyfishSpawns.slice(0, 1);
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = (spawnIndex * 7 + Math.floor(elapsed * 3)) % Math.max(1, total);
  let selected = pool[0];
  for (const entry of pool) {
    if (roll < entry.weight) {
      selected = entry;
      break;
    }
    roll -= entry.weight;
  }
  return enemies.find((enemy) => enemy.id === selected.enemyId) ?? enemies[0];
}

export function spawnJellyfish(state, level, enemies) {
  const enemy = chooseSpawn(level, enemies, state.elapsed, state.spawnIndex);
  const lane = level.spawnLanes[state.spawnIndex % level.spawnLanes.length];
  const xJitter = Math.sin(state.spawnIndex * 2.31) * 42;
  const x = Math.max(70, Math.min(VIEW_W - 70, lane.x + xJitter));
  state.jellyfish.push({
    id: `${enemy.id}_${state.spawnIndex}`,
    type: enemy.id,
    x,
    y: VIEW_H + 72,
    vx: 0,
    vy: -enemy.baseSpeed,
    radius: enemy.radius,
    baseX: x,
    windOffset: 0,
    phase: state.spawnIndex * 0.8,
    age: 0,
    animation: "fly",
    animTime: 0,
    captured: false,
    escaping: false
  });
  state.spawnIndex += 1;
}

export function nextSpawnInterval(level, elapsed) {
  const active = level.jellyfishSpawns.filter((entry) => elapsed >= entry.timeStart && elapsed < entry.timeEnd);
  const intervals = active.length ? active.map((entry) => entry.interval) : [1.45];
  return Math.max(0.48, intervals.reduce((sum, value) => sum + value, 0) / intervals.length);
}
