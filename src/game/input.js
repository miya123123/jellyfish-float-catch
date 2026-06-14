export function installInput(canvas, state, config, audio) {
  const canStart = () => state.mode === "ready" || state.mode === "gameover" || state.mode === "gameend" || state.mode === "clear";

  const clampPointer = () => {
    const move = config.player.movement;
    state.pointer.x = Math.max(move.minX, Math.min(move.maxX, state.pointer.x));
    state.pointer.y = Math.max(move.minY, Math.min(move.maxY, state.pointer.y));
  };

  const setTarget = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const xRatio = canvas.width / rect.width;
    const yRatio = canvas.height / rect.height;
    state.pointer.x = (clientX - rect.left) * xRatio;
    state.pointer.y = (clientY - rect.top) * yRatio;
    clampPointer();
  };

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    audio.resume();
    if (canStart()) {
      config.reset();
    }
    canvas.setPointerCapture?.(event.pointerId);
    state.pointer.active = true;
    setTarget(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.pointer.active && state.mode === "playing") return;
    setTarget(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerup", (event) => {
    state.pointer.active = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "ArrowLeft" || key === "a") state.input.left = true;
    if (event.key === "ArrowRight" || key === "d") state.input.right = true;
    if (event.key === "ArrowUp" || key === "w") state.input.up = true;
    if (event.key === "ArrowDown" || key === "s") state.input.down = true;
    if (event.key === " " && canStart()) {
      config.reset();
    }
    if (key === "m") {
      audio.setMuted(!state.muted);
    }
    if (key === "f") {
      if (!document.fullscreenElement) {
        canvas.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
    clampPointer();
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "ArrowLeft" || key === "a") state.input.left = false;
    if (event.key === "ArrowRight" || key === "d") state.input.right = false;
    if (event.key === "ArrowUp" || key === "w") state.input.up = false;
    if (event.key === "ArrowDown" || key === "s") state.input.down = false;
  });
}
