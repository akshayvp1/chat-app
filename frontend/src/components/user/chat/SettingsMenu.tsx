import type { ChangeEvent } from "react";
import {
  Bell,
  BellOff,
  Camera,
  Moon,
  Play,
  Square,
  Sun,
  Volume2,
} from "lucide-react";

import type { ThemePreference } from "../../../hooks/useChatSettings";
import type { MessageNotificationPreferences } from "../../../utils/messageNotifications";
import { loadCallSoundSettings } from "../../../utils/ringtone";

interface SettingsMenuProps {
  theme: ThemePreference;
  notificationPrefs: MessageNotificationPreferences;
  callSoundSettings: ReturnType<typeof loadCallSoundSettings>;
  onToggleTheme: () => void;
  onToggleMessageSound: () => void;
  onToggleCallSounds: () => void;
  onRingtoneVolumeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPlayRingtonePreview: () => void;
  onStopSoundPreview: () => void;
  onToggleDesktopNotifications: () => void;
  onChangeProfilePicture: () => void;
}

export default function SettingsMenu({
  theme,
  notificationPrefs,
  callSoundSettings,
  onToggleTheme,
  onToggleMessageSound,
  onToggleCallSounds,
  onRingtoneVolumeChange,
  onPlayRingtonePreview,
  onStopSoundPreview,
  onToggleDesktopNotifications,
  onChangeProfilePicture,
}: SettingsMenuProps) {
  return (
    <div className="absolute right-0 top-full z-30 mt-2 max-h-[calc(100dvh-5rem)] w-[min(13rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg dark:border-border">
      <button
        type="button"
        onClick={onChangeProfilePicture}
        className="mb-2 flex w-full items-center gap-2 border-b border-border pb-2 text-left text-xs font-semibold text-foreground hover:text-[#8065E8] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-border dark:hover:text-[#C9BFFF]"
      >
        <Camera className="h-3.5 w-3.5 shrink-0" />
        Change profile picture
      </button>

      <p className="mb-1 text-xs font-bold text-foreground">Appearance</p>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-pressed={theme === "dark"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="mb-2 flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {theme === "dark" ? (
          <Sun className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Moon className="h-3.5 w-3.5 shrink-0" />
        )}
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>

      <p className="mb-1 border-t border-border pt-2 text-xs font-bold text-foreground dark:border-border">
        Notifications
      </p>

      <label className="flex items-center justify-between gap-2 rounded-md py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 shrink-0" />
          Message sound
        </span>

        <input
          type="checkbox"
          checked={notificationPrefs.messageSound}
          onChange={onToggleMessageSound}
          aria-label="Message sound"
          className="h-4 w-4 shrink-0 accent-[#8065E8]"
        />
      </label>

      <label className="flex items-center justify-between gap-2 rounded-md py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5 shrink-0" />
          Call sounds
        </span>

        <input
          type="checkbox"
          checked={callSoundSettings.enabled}
          onChange={onToggleCallSounds}
          aria-label="Call sounds"
          className="h-4 w-4 shrink-0 accent-[#8065E8]"
        />
      </label>

      <label className="flex items-center justify-between gap-2 rounded-md py-1.5 text-xs text-muted-foreground">
        <span>Ringtone volume</span>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(callSoundSettings.volume * 100)}
          onChange={onRingtoneVolumeChange}
          disabled={!callSoundSettings.enabled}
          aria-label="Ringtone volume"
          className="h-1.5 w-20 shrink-0 accent-[#8065E8] disabled:opacity-40"
        />
      </label>

      <div className="mb-2 flex gap-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={onPlayRingtonePreview}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#EEE9FF] px-2 py-1.5 text-[11px] font-semibold text-[#8065E8] hover:bg-[#dfd7ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:bg-[#8065E8]/20 dark:text-[#C9BFFF] dark:hover:bg-[#8065E8]/30"
        >
          <Play className="h-3 w-3" />
          Test sound
        </button>
        <button
          type="button"
          onClick={onStopSoundPreview}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Square className="h-3 w-3" />
          Stop
        </button>
      </div>

      <label className="flex items-center justify-between gap-2 rounded-md py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          {notificationPrefs.desktopNotifications ? (
            <Bell className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <BellOff className="h-3.5 w-3.5 shrink-0" />
          )}
          Desktop alerts
        </span>

        <input
          type="checkbox"
          checked={notificationPrefs.desktopNotifications}
          onChange={onToggleDesktopNotifications}
          aria-label="Desktop alerts"
          className="h-4 w-4 shrink-0 accent-[#8065E8]"
        />
      </label>
    </div>
  );
}
