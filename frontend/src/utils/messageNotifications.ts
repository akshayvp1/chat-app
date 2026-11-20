import { isRingtoneActive } from "./ringtone";

export interface MessageNotificationPreferences {
  messageSound: boolean;
  desktopNotifications: boolean;
}

const STORAGE_KEY = "chatapp.message-notification-preferences";

const DEFAULT_PREFERENCES: MessageNotificationPreferences = {
  messageSound: true,
  desktopNotifications: false,
};

export function loadMessageNotificationPreferences(): MessageNotificationPreferences {
  if (typeof localStorage === "undefined") {
    return { ...DEFAULT_PREFERENCES };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MessageNotificationPreferences>;
    return {
      messageSound: parsed.messageSound === true,
      desktopNotifications: parsed.desktopNotifications === true,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveMessageNotificationPreferences(
  preferences: MessageNotificationPreferences,
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

let messageAudioContext: AudioContext | null = null;

function getMessageAudioContext(): AudioContext | null {
  try {
    const audioWindow = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor =
      window.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextCtor) return null;

    if (!messageAudioContext) {
      messageAudioContext = new AudioContextCtor();
    }

    return messageAudioContext;
  } catch {
    return null;
  }
}

export function playMessageSound(): void {
  if (isRingtoneActive()) return;

  const context = getMessageAudioContext();
  if (!context) return;

  try {
    if (context.state === "suspended") {
      void context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch {
    return;
  }
}

export async function requestDesktopNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

function showDesktopNotification(
  title: string,
  body: string,
  tag: string,
): void {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  try {
    new Notification(title, { body, tag, icon: "/olam.png" });
  } catch {
    return;
  }
}

export function notifyIncomingMessage(
  preferences: MessageNotificationPreferences,
  title: string,
  body: string,
  tag: string,
): void {
  if (preferences.messageSound) {
    playMessageSound();
  }

  if (preferences.desktopNotifications) {
    showDesktopNotification(title, body, tag);
  }
}
