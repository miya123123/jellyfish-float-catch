export function createAudio(state, audioConfig = {}) {
  let ctx = null;
  let bgm = null;

  function ensure() {
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ctx = new AudioCtor();
    }
    return ctx;
  }

  function tone(freq, duration, type = "sine", gainValue = 0.06) {
    if (state.muted) return;
    const audio = ensure();
    if (!audio) return;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration + 0.03);
  }

  return {
    resume() {
      const audio = ensure();
      if (!audio) return;
      if (audio.state === "suspended") audio.resume();
      if (!bgm && audioConfig.bgm?.src) {
        bgm = new Audio(audioConfig.bgm.src);
        bgm.loop = audioConfig.bgm.loop !== false;
        bgm.volume = audioConfig.bgm.volume ?? 0.42;
      }
      if (bgm && !state.muted && bgm.paused) {
        bgm.play().catch(() => {
          // Browsers may defer playback until the next direct user gesture.
        });
      }
    },
    setMuted(muted) {
      state.muted = muted;
      if (!bgm) return;
      bgm.muted = muted;
      if (muted) {
        bgm.pause();
      } else {
        this.resume();
      }
    },
    capture() {
      tone(660, 0.16, "sine", 0.05);
      setTimeout(() => tone(990, 0.12, "triangle", 0.04), 45);
    },
    miss() {
      tone(180, 0.18, "sine", 0.05);
    },
    end(clear) {
      tone(clear ? 740 : 130, 0.32, clear ? "triangle" : "sine", 0.06);
    }
  };
}
