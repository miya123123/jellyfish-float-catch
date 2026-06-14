export function installInput(canvas, state, config, audio) {
  const canStart = () => state.mode === "ready" || state.mode === "gameover" || state.mode === "gameend" || state.mode === "clear";
  const startFromUserGesture = () => {
    audio.resume();
    if (canStart()) {
      config.reset();
    }
  };

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
    startFromUserGesture();
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

  canvas.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    event.preventDefault();
    startFromUserGesture();
    state.pointer.active = true;
    setTarget(touch.clientX, touch.clientY);
  }, { passive: false });

  canvas.addEventListener("touchmove", (event) => {
    const touch = event.changedTouches[0] ?? event.touches[0];
    if (!touch) return;
    if (!state.pointer.active && state.mode === "playing") return;
    event.preventDefault();
    setTarget(touch.clientX, touch.clientY);
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    state.pointer.active = false;
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.key === "ArrowLeft" || key === "a") state.input.left = true;
    if (event.key === "ArrowRight" || key === "d") state.input.right = true;
    if (event.key === "ArrowUp" || key === "w") state.input.up = true;
    if (event.key === "ArrowDown" || key === "s") state.input.down = true;
    if (event.key === " " && canStart()) {
      event.preventDefault();
      startFromUserGesture();
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
