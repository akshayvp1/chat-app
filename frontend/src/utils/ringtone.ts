// Synthesized ringtone via Web Audio API — no audio asset needed.
let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let activeOscillators: OscillatorNode[] = [];

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, startTime: number, ctx: AudioContext, gainValue = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
  activeOscillators.push(osc);
}

/** Classic dual-tone ring pattern for incoming calls: two short bursts, then a pause. */
export function startIncomingRingtone() {
  stopRingtone();
  const ctx = getContext();
  if (ctx.state === "suspended") ctx.resume();

  function ringCycle() {
    const now = ctx.currentTime;
    playTone(440, 0.4, now, ctx);
    playTone(480, 0.4, now, ctx);
    playTone(440, 0.4, now + 0.6, ctx);
    playTone(480, 0.4, now + 0.6, ctx);
  }

  ringCycle();
  ringInterval = setInterval(ringCycle, 2000);
}

/** Softer single-tone ringback for the caller while the other side is ringing. */
export function startOutgoingRingback() {
  stopRingtone();
  const ctx = getContext();
  if (ctx.state === "suspended") ctx.resume();

  function cycle() {
    playTone(425, 1, ctx.currentTime, ctx, 0.08);
  }

  cycle();
  ringInterval = setInterval(cycle, 3000);
}

export function stopRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  });
  activeOscillators = [];
}