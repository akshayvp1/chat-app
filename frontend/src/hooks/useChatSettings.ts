import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

import type { StatusToastData } from "@/components/ui/StatusToast";
import { THEME_STORAGE_KEY } from "../constants/brand";
import type { useCall } from "./useCall";
import type { useGroupCall } from "./useGroupCall";
import {
  loadMessageNotificationPreferences,
  requestDesktopNotificationPermission,
  saveMessageNotificationPreferences,
  type MessageNotificationPreferences,
} from "../utils/messageNotifications";
import {
  loadCallSoundSettings,
  setCallSoundsEnabled,
  setRingtoneVolume,
  startGroupIncomingRingtone,
  startIncomingRingtone,
  stopRingtone,
} from "../utils/ringtone";

export type ThemePreference = "light" | "dark";

type DirectCallPreview = Pick<ReturnType<typeof useCall>, "status" | "callType">;
type GroupCallPreview = Pick<
  ReturnType<typeof useGroupCall>,
  "status" | "callType"
>;

interface UseChatSettingsParams {
  call: DirectCallPreview;
  groupCall: GroupCallPreview;
  onToast: (toast: StatusToastData) => void;
}

function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "light";

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

export function useChatSettings({
  call,
  groupCall,
  onToast,
}: UseChatSettingsParams) {
  const [theme, setTheme] = useState<ThemePreference>(getStoredTheme);

  const [notificationPrefs, setNotificationPrefs] =
    useState<MessageNotificationPreferences>(
      loadMessageNotificationPreferences,
    );

  const [callSoundSettings, setCallSoundSettings] = useState(
    loadCallSoundSettings,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function toggleMessageSound() {
    const next = {
      ...notificationPrefs,
      messageSound: !notificationPrefs.messageSound,
    };

    setNotificationPrefs(next);
    saveMessageNotificationPreferences(next);
  }

  async function toggleDesktopNotifications() {
    if (notificationPrefs.desktopNotifications) {
      const next = {
        ...notificationPrefs,
        desktopNotifications: false,
      };

      setNotificationPrefs(next);
      saveMessageNotificationPreferences(next);
      return;
    }

    const granted = await requestDesktopNotificationPermission();
    if (!granted) return;

    const next = {
      ...notificationPrefs,
      desktopNotifications: true,
    };

    setNotificationPrefs(next);
    saveMessageNotificationPreferences(next);
  }

  function toggleCallSounds() {
    const enabled = !callSoundSettings.enabled;
    setCallSoundsEnabled(enabled);
    setCallSoundSettings((current) => ({ ...current, enabled }));
  }

  function handleRingtoneVolumeChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const volume = Number(event.target.value) / 100;
    setRingtoneVolume(volume);
    setCallSoundSettings((current) => ({ ...current, volume }));
  }

  function playRingtonePreview() {
    if (!callSoundSettings.enabled) {
      onToast({
        kind: "warning",
        message: "Call sounds are off. Enable them to hear ringtones.",
      });
      return;
    }

    if (call.status !== "idle") {
      startIncomingRingtone(call.callType ?? "audio");
    } else if (groupCall.status !== "idle") {
      startGroupIncomingRingtone(groupCall.callType ?? "audio");
    } else {
      startIncomingRingtone("video");
    }
  }

  function stopSoundPreview() {
    stopRingtone();
  }

  return {
    theme,
    toggleTheme,
    notificationPrefs,
    toggleMessageSound,
    toggleDesktopNotifications,
    callSoundSettings,
    toggleCallSounds,
    handleRingtoneVolumeChange,
    playRingtonePreview,
    stopSoundPreview,
  };
}

export type ChatSettingsResult = ReturnType<typeof useChatSettings>;
