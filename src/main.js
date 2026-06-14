import { overlaps, createCaptureParticles, createMissParticles } from "./game/collision.js";
import { createAudio } from "./game/audio.js";
import { installInput } from "./game/input.js";
import { render } from "./game/rendering.js";
import { createInitialState, resetRun, VIEW_H, VIEW_W } from "./game/state.js";
import { getWind, nextSpawnInterval, spawnJellyfish } from "./game/spawning.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const paths = {
  player: "data/player.json",
  enemies: "data/enemies.json",
  level: "data/levels/level_deepsea_01.json",
  hud: "data/hud.json"
};

const config = await loadConfig();
const state = createInitialState(config);
const audio = createAudio(state, config.hud.audio);
const assets = await loadAssets(config);
state.mode = "ready";
state.assetsReady = true;

config.reset = () => resetRun(state, config);
installInput(canvas, state, config, audio);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(ctx, state, config, assets);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function update(dt) {
  if (state.mode !== "playing") {
    state.player.animTime += dt;
    updateParticles(dt);
    return;
  }

  state.elapsed += dt;
  state.wind = getWind(config.level, state.elapsed);
  updatePlayer(dt);
  updateSpawning(dt);
  updateJellyfish(dt);
  updateParticles(dt);
  checkEnd();
}

function updatePlayer(dt) {
  const move = config.player.movement;
  let inputX = Number(state.input.right) - Number(state.input.left);
  let inputY = Number(state.input.down) - Number(state.input.up);
  const inputLength = Math.hypot(inputX, inputY);
  if (inputLength > 0) {
    inputX /= inputLength;
    inputY /= inputLength;
    const targetSpeed = move.keyboardTargetSpeed ?? move.maxSpeed;
    state.pointer.x += inputX * targetSpeed * dt;
    state.pointer.y += inputY * targetSpeed * dt;
    state.pointer.x = Math.max(move.minX, Math.min(move.maxX, state.pointer.x));
    state.pointer.y = Math.max(move.minY, Math.min(move.maxY, state.pointer.y));
  }

  const targetX = state.pointer.x;
  const targetY = state.pointer.y;
  const dx = targetX - state.player.x;
  const dy = targetY - state.player.y;
  const accelX = dx * move.followStrength;
  const accelY = dy * move.followStrength;
  state.player.vx = (state.player.vx + accelX * dt) * move.inertiaDamping;
  state.player.vy = (state.player.vy + accelY * dt) * move.inertiaDamping;
  const speed = Math.hypot(state.player.vx, state.player.vy);
  if (speed > move.maxSpeed) {
    const scale = move.maxSpeed / speed;
    state.player.vx *= scale;
    state.player.vy *= scale;
  }
  state.player.vx = Math.max(-move.maxSpeed, Math.min(move.maxSpeed, state.player.vx));
  state.player.vy = Math.max(-move.maxSpeed, Math.min(move.maxSpeed, state.player.vy));
  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;
  state.player.x = Math.max(move.minX, Math.min(move.maxX, state.player.x));
  state.player.y = Math.max(move.minY, Math.min(move.maxY, state.player.y));
  state.player.animation = Math.hypot(state.player.vx, state.player.vy) > 38 ? "slide" : "idle";
  if (state.player.captureTimer > 0) {
    state.player.captureTimer -= dt;
    state.player.animation = "capture_split";
  }
  state.player.animTime += dt;
}

function updateSpawning(dt) {
  state.spawnClock -= dt;
  if (state.spawnClock <= 0) {
    spawnJellyfish(state, config.level, config.enemies);
    state.spawnClock = nextSpawnInterval(config.level, state.elapsed);
  }
}

function updateJellyfish(dt) {
  const playerCircle = { x: state.player.x, y: state.player.y, radius: state.player.radius };
  for (const jelly of state.jellyfish) {
    const enemy = config.enemiesById.get(jelly.type);
    jelly.age += dt;
    jelly.animTime += dt;
    const windSensitivity = enemy.drift.mode === "wind_lean" ? 1.16 : enemy.drift.mode === "zigzag" ? 0.96 : 0.82;
    jelly.windOffset = Math.max(-420, Math.min(420, jelly.windOffset + state.wind.xForce * windSensitivity * dt));
    let drift = 0;
    if (enemy.drift.mode === "soft_sine") {
      drift = Math.sin(jelly.age * enemy.drift.frequency + jelly.phase) * enemy.drift.amplitude;
    } else if (enemy.drift.mode === "zigzag") {
      drift = Math.sin(jelly.age * enemy.drift.frequency * Math.PI + jelly.phase) * enemy.drift.amplitude;
    } else {
      drift = Math.sin(jelly.age * enemy.drift.frequency + jelly.phase) * enemy.drift.amplitude + Math.sign(state.wind.xForce) * 18;
    }
    jelly.x = Math.max(42, Math.min(VIEW_W - 42, jelly.baseX + drift + jelly.windOffset));
    jelly.y += jelly.vy * dt;

    if (!jelly.captured && overlaps(playerCircle, jelly)) {
      catchJellyfish(jelly, enemy);
    }

    if (!jelly.captured && jelly.y < -60) {
      jelly.captured = true;
      jelly.escaping = true;
      jelly.animation = "escape";
      jelly.animTime = 0;
      state.missed += 1;
      createMissParticles(state, jelly.x, 34);
      audio.miss();
    }
  }
  state.jellyfish = state.jellyfish.filter((jelly) => {
    if (jelly.captured && !jelly.escaping) return false;
    if (jelly.escaping && jelly.animTime > 0.8) return false;
    return jelly.y > -120;
  });
}

function catchJellyfish(jelly, enemy) {
  jelly.captured = true;
  state.catches += 1;
  const withinCombo = state.elapsed - state.lastCatchAt <= config.hud.comboWindow;
  state.combo = withinCombo ? state.combo + 1 : 1;
  state.lastCatchAt = state.elapsed;
  state.score += enemy.score + Math.max(0, state.combo - 1) * config.hud.comboBonus;
  state.player.captureTimer = 0.42;
  createCaptureParticles(state, jelly.x, jelly.y, enemy.id.includes("mint") ? "#6FE7E4" : enemy.id.includes("star") ? "#FFD6F6" : "#B8A7FF");
  audio.capture();
}

function updateParticles(dt) {
  for (const p of state.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy *= 0.985;
  }
  state.particles = state.particles.filter((p) => p.age < p.life);
}

function checkEnd() {
  if (state.missed >= config.hud.missLimit) {
    state.mode = "gameover";
    audio.end(false);
  } else if (state.elapsed >= config.hud.timeLimitSeconds) {
    state.mode = "gameend";
    audio.end(true);
  }
}

async function loadConfig() {
  const [player, enemies, level, hud] = await Promise.all([
    fetchJson(paths.player),
    fetchJson(paths.enemies),
    fetchJson(paths.level),
    fetchJson(paths.hud)
  ]);
  return {
    player,
    enemies,
    enemiesById: new Map(enemies.map((enemy) => [enemy.id, enemy])),
    level,
    hud,
    reset: () => {}
  };
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

async function loadAssets(config) {
  const imagePaths = new Set([config.level.background.image]);
  for (const animation of Object.values(config.player.animations)) {
    imagePaths.add(animation.sprite);
  }
  for (const enemy of config.enemies) {
    for (const animation of Object.values(enemy.animations)) {
      imagePaths.add(animation.sprite);
    }
  }
  const images = new Map();
  await Promise.all([...imagePaths].map((path) => loadImage(path).then((image) => images.set(path, image))));
  return { images };
}

function loadImage(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(image);
    image.src = path;
  });
}

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    update(1 / 60);
  }
  render(ctx, state, config, assets);
};

window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: "origin top-left, x right, y down, 1280x720",
  mode: state.mode,
  elapsed: Number(state.elapsed.toFixed(2)),
  score: state.score,
  missed: state.missed,
  wind: state.wind,
  windDirection: state.wind.xForce < 0 ? "left" : state.wind.xForce > 0 ? "right" : "calm",
  windStrength: Math.abs(state.wind.xForce),
  player: {
    x: Number(state.player.x.toFixed(1)),
    y: Number(state.player.y.toFixed(1)),
    vx: Number(state.player.vx.toFixed(1)),
    vy: Number(state.player.vy.toFixed(1)),
    radius: state.player.radius,
    animation: state.player.animation
  },
  timeRemaining: Math.max(0, Number((config.hud.timeLimitSeconds - state.elapsed).toFixed(2))),
  jellyfish: state.jellyfish.slice(0, 8).map((jelly) => ({
    id: jelly.id,
    type: jelly.type,
    x: Number(jelly.x.toFixed(1)),
    y: Number(jelly.y.toFixed(1)),
    radius: jelly.radius,
    animation: jelly.animation
  })),
  particles: state.particles.length
});
