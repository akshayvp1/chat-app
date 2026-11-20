type RingType = "audio" | "video";
type RingKind = "direct" | "group";

type RingMode =
  | "direct-audio-incoming"
  | "direct-video-incoming"
  | "direct-audio-outgoing"
  | "direct-video-outgoing"
  | "group-audio-incoming"
  | "group-video-incoming"
  | "group-audio-outgoing"
  | "group-video-outgoing";

interface CallSoundSettings {
  enabled: boolean;
  volume: number;
}

interface ActiveTone {
  oscillator: OscillatorNode;
  gain: GainNode;
}

const STORAGE_KEY = "chatapp.call-sound-settings";
const DEFAULT_SETTINGS: CallSoundSettings = { enabled: true, volume: 0.7 };

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;
let activeTones: ActiveTone[] = [];
let activeMode: RingMode | null = null;
let settings: CallSoundSettings = loadCallSoundSettings();

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.volume;
  return Math.min(1, Math.max(0, value));
}

export function loadCallSoundSettings(): CallSoundSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_SETTINGS };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<CallSoundSettings>;
    return {
      enabled: parsed.enabled !== false,
      volume:
        typeof parsed.volume === "number"
          ? clampVolume(parsed.volume)
          : DEFAULT_SETTINGS.volume,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export function setCallSoundsEnabled(enabled: boolean): void {
  settings = { ...settings, enabled };
  persistSettings();
  if (!enabled) stopRingtone();
}

export function setRingtoneVolume(volume: number): void {
  settings = { ...settings, volume: clampVolume(volume) };
  persistSettings();

  const mode = activeMode;
  if (mode) {
    stopRingtone();
    startRingtone(mode);
  }
}

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const audioWindow = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextCtor =
        window.AudioContext ?? audioWindow.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx = new AudioContextCtor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  duration: number,
  startTime: number,
  ctx: AudioContext,
  gainValue = 0.12,
  waveform: OscillatorType = "triangle"
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveform;
  osc.frequency.value = freq;
  gain.gain.value = Math.max(0.0001, gainValue * settings.volume);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
  activeTones.push({ oscillator: osc, gain });
}

function playMelody(
  notes: number[],
  step: number,
  duration: number,
  startTime: number,
  ctx: AudioContext,
  gainValue = 0.12,
  waveform: OscillatorType = "triangle"
): void {
  notes.forEach((note, index) => {
    playTone(note, duration, startTime + index * step, ctx, gainValue, waveform);
  });
}

function schedulePattern(mode: RingMode, ctx: AudioContext): void {
  const now = ctx.currentTime;

  switch (mode) {
    case "direct-audio-incoming":
      playMelody([659.25, 880, 659.25], 0.2, 0.18, now, ctx, 0.12);
      return;
    case "direct-video-incoming":
      playMelody([523.25, 659.25, 783.99, 659.25], 0.16, 0.15, now, ctx, 0.11, "sine");
      return;
    case "direct-audio-outgoing":
      playTone(440, 0.75, now, ctx, 0.075, "sine");
      playTone(523.25, 0.75, now + 0.8, ctx, 0.075, "sine");
      return;
    case "direct-video-outgoing":
      playMelody([523.25, 659.25, 783.99], 0.24, 0.22, now, ctx, 0.09);
      return;
    case "group-audio-incoming":
      playMelody([523.25, 659.25, 783.99, 1046.5], 0.18, 0.16, now, ctx, 0.1);
      return;
    case "group-video-incoming":
      playMelody([659.25, 783.99, 987.77, 783.99, 659.25], 0.15, 0.14, now, ctx, 0.095, "sine");
      return;
    case "group-audio-outgoing":
      playMelody([392, 523.25, 659.25], 0.26, 0.24, now, ctx, 0.085);
      return;
    case "group-video-outgoing":
      playMelody([523.25, 783.99, 659.25, 783.99], 0.2, 0.18, now, ctx, 0.085);
  }
}

function getInterval(mode: RingMode): number {
  if (mode.endsWith("audio-outgoing")) return 2800;
  if (mode.endsWith("video-outgoing")) return 2600;
  if (mode.startsWith("group")) return 2400;
  return 2200;
}

function buildMode(
  scope: RingKind,
  direction: "incoming" | "outgoing",
  type: RingType
): RingMode {
  return `${scope}-${type}-${direction}` as RingMode;
}

export function startRingtone(mode: RingMode): void {
  stopRingtone();

  if (!settings.enabled) return;

  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  activeMode = mode;
  schedulePattern(mode, ctx);
  ringInterval = setInterval(() => schedulePattern(mode, ctx), getInterval(mode));
}

export function isRingtoneActive(): boolean {
  return activeMode !== null;
}

export function stopRingtone(kind?: RingKind): void {
  if (kind && activeMode && !activeMode.startsWith(kind)) return;

  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }

  const now = audioCtx?.currentTime ?? 0;
  activeTones.forEach(({ oscillator, gain }) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      oscillator.stop(now + 0.04);
    } catch {
      return;
    }
  });
  activeTones = [];
  activeMode = null;
}

export function startIncomingRingtone(type: RingType = "audio"): void {
  startRingtone(buildMode("direct", "incoming", type));
}

export function startOutgoingRingback(type: RingType = "audio"): void {
  startRingtone(buildMode("direct", "outgoing", type));
}

export function startGroupIncomingRingtone(type: RingType = "audio"): void {
  startRingtone(buildMode("group", "incoming", type));
}

export function startGroupOutgoingRingback(type: RingType = "audio"): void {
  startRingtone(buildMode("group", "outgoing", type));
}
