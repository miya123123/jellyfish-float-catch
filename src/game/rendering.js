import { VIEW_H, VIEW_W } from "./state.js";

function drawSprite(ctx, image, rows, cols, frame, x, y, size, alpha = 1) {
  if (!image?.complete || image.naturalWidth === 0) return false;
  const col = frame % cols;
  const row = Math.floor(frame / cols) % rows;
  const sw = image.naturalWidth / cols;
  const sh = image.naturalHeight / rows;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, col * sw, row * sh, sw, sh, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  return true;
}

function drawFallbackBubble(ctx, player) {
  const gradient = ctx.createRadialGradient(player.x - 20, player.y - 20, 10, player.x, player.y, player.radius);
  gradient.addColorStop(0, "rgba(255, 214, 246, 0.48)");
  gradient.addColorStop(0.6, "rgba(111, 231, 228, 0.22)");
  gradient.addColorStop(1, "rgba(184, 167, 255, 0.62)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(234, 251, 255, 0.86)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawFallbackJelly(ctx, jelly, enemy) {
  ctx.fillStyle = enemy.id.includes("mint") ? "#6FE7E4" : enemy.id.includes("star") ? "#FFD6F6" : "#B8A7FF";
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.ellipse(jelly.x, jelly.y - 8, jelly.radius, jelly.radius * 0.72, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.66;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(jelly.x + i * 9, jelly.y + 2);
    ctx.quadraticCurveTo(jelly.x + i * 11 + Math.sin(jelly.age * 5 + i) * 8, jelly.y + 26, jelly.x + i * 10, jelly.y + 46);
    ctx.strokeStyle = "#EAFBFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function render(ctx, state, config, assets) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const bg = assets.images.get(config.level.background.image);
  if (bg?.complete) {
    ctx.drawImage(bg, 0, 0, VIEW_W, VIEW_H);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, "#071A33");
    gradient.addColorStop(1, "#12385B");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  for (const p of state.particles) {
    const t = Math.max(0, 1 - p.age / p.life);
    ctx.globalAlpha = t;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.7 + t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const jelly of state.jellyfish) {
    const enemy = config.enemiesById.get(jelly.type);
    const anim = enemy.animations[jelly.animation] ?? enemy.animations.fly;
    const image = assets.images.get(anim.sprite);
    const frame = Math.floor(jelly.animTime * anim.fps) % (anim.rows * anim.cols);
    const size = enemy.id.includes("mint") ? 92 : 98;
    if (!drawSprite(ctx, image, anim.rows, anim.cols, frame, jelly.x, jelly.y, size, jelly.escaping ? 0.56 : 1)) {
      drawFallbackJelly(ctx, jelly, enemy);
    }
  }

  const playerAnim = config.player.animations[state.player.animation] ?? config.player.animations.idle;
  const playerImage = assets.images.get(playerAnim.sprite);
  const playerFrame = Math.floor(state.player.animTime * playerAnim.fps) % (playerAnim.rows * playerAnim.cols);
  if (!drawSprite(ctx, playerImage, playerAnim.rows, playerAnim.cols, playerFrame, state.player.x, state.player.y, 132)) {
    drawFallbackBubble(ctx, state.player);
  }

  drawHud(ctx, state, config);
}

function drawHud(ctx, state, config) {
  const hud = config.hud;
  ctx.fillStyle = hud.colors.panel;
  ctx.fillRect(0, 0, VIEW_W, 72);
  ctx.font = `700 24px ${hud.fontFamily}`;
  ctx.fillStyle = hud.colors.text;
  ctx.fillText(`Score ${state.score}`, 32, 44);
  const timeRemaining = Math.max(0, Math.ceil(hud.timeLimitSeconds - state.elapsed));
  ctx.fillText(`Time ${timeRemaining}`, 240, 44);
  ctx.fillText(`Miss ${state.missed}/${hud.missLimit}`, 430, 44);
  drawWindIndicator(ctx, state, hud);
  if (state.combo > 1) {
    ctx.fillStyle = "#FFD6F6";
    ctx.fillText(`Combo x${state.combo}`, 1095, 44);
  }

  if (state.mode === "ready") {
    drawHowToPlay(ctx);
  }
  if (state.mode === "gameend") {
    drawCenterText(ctx, "Game End", "クリックまたはSpaceでリスタート");
  }
  if (state.mode === "gameover") {
    drawCenterText(ctx, "Game Over", "クリックまたはSpaceでリスタート");
  }
}

function drawWindIndicator(ctx, state, hud) {
  const force = state.wind.xForce;
  const direction = force < 0 ? "LEFT" : force > 0 ? "RIGHT" : "CALM";
  const arrow = force < 0 ? "<" : force > 0 ? ">" : "-";
  const strength = Math.min(1, Math.abs(force) / 150);
  const x = 650;
  const y = 22;
  const meterW = 182;
  const meterH = 10;

  ctx.save();
  ctx.fillStyle = hud.colors.accent;
  ctx.font = `800 22px ${hud.fontFamily}`;
  ctx.fillText(`Wind ${arrow} ${direction}`, x, 44);

  ctx.fillStyle = "rgba(234, 251, 255, 0.24)";
  ctx.fillRect(x + 166, y + 7, meterW, meterH);
  ctx.fillStyle = force === 0 ? "rgba(234, 251, 255, 0.54)" : force < 0 ? "#B8A7FF" : "#6FE7E4";
  if (force < 0) {
    const filled = meterW * strength;
    ctx.fillRect(x + 166 + meterW - filled, y + 7, filled, meterH);
  } else {
    ctx.fillRect(x + 166, y + 7, meterW * strength, meterH);
  }

  ctx.strokeStyle = "rgba(234, 251, 255, 0.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (force < 0) {
    ctx.moveTo(x + 318, y + 32);
    ctx.lineTo(x + 190, y + 32);
    ctx.lineTo(x + 206, y + 20);
    ctx.moveTo(x + 190, y + 32);
    ctx.lineTo(x + 206, y + 44);
  } else if (force > 0) {
    ctx.moveTo(x + 190, y + 32);
    ctx.lineTo(x + 318, y + 32);
    ctx.lineTo(x + 302, y + 20);
    ctx.moveTo(x + 318, y + 32);
    ctx.lineTo(x + 302, y + 44);
  } else {
    ctx.moveTo(x + 222, y + 32);
    ctx.lineTo(x + 286, y + 32);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCenterText(ctx, title, sub) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 26, 51, 0.5)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#EAFBFF";
  ctx.font = "700 72px system-ui, sans-serif";
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 18);
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillStyle = "#6FE7E4";
  ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 44);
  ctx.restore();
}

function drawHowToPlay(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(7, 26, 51, 0.58)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#EAFBFF";
  ctx.font = "700 64px system-ui, sans-serif";
  ctx.fillText("Swipe / Drag to Start", VIEW_W / 2, 250);
  ctx.font = "500 27px system-ui, sans-serif";
  ctx.fillStyle = "#6FE7E4";
  ctx.fillText("ドラッグや上下左右キーで泡を動かし、上昇するくらげを包みます", VIEW_W / 2, 312);
  ctx.fillStyle = "#EAFBFF";
  ctx.font = "500 23px system-ui, sans-serif";
  ctx.fillText("39秒経過でGame End / 5匹逃すとGame Over", VIEW_W / 2, 360);
  ctx.fillText("7秒ごとに強い風向きが変化し、HUDの矢印で確認できます", VIEW_W / 2, 398);
  ctx.fillStyle = "#FFD6F6";
  ctx.font = "500 21px system-ui, sans-serif";
  ctx.fillText("Keyboard: ↑ ↓ ← → / W A S D   Restart: Space   Mute: M   Fullscreen: F", VIEW_W / 2, 452);
  ctx.restore();
}
