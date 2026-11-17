import React from "react";
import { Phone, Video } from "lucide-react";
import { useElapsedSeconds, formatDuration } from "../../hooks/useElapsedSeconds";
import type { ActiveGroupCall } from "../../hooks/useGroupCall";

const BRAND_COLOR = "#5b7cfa";

interface ActiveCallBannerProps {
  call: ActiveGroupCall;
  /** Disabled while the user is busy in some other call. */
  disabled?: boolean;
  onJoin: () => void;
}

/**state
 * Shown in a group's header while a call is running there and the user
 * is not in it — after declining, after leaving, or after joining the
 * group late. It disappears only when the server says the call ended.
 */
export default function ActiveCallBanner({
  call,
  disabled,
  onJoin,
}: ActiveCallBannerProps) {
  const elapsed = useElapsedSeconds(call.startedAt);
  const Icon = call.type === "video" ? Video : Phone;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800">
          {call.type === "video" ? "Video" : "Voice"} call in progress
        </p>
        <p className="text-[11px] text-slate-500">
          {call.participantCount} in call · {formatDuration(elapsed)}
        </p>
      </div>

      <button
        type="button"
        onClick={onJoin}
        disabled={disabled}
        className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: BRAND_COLOR }}
        title={disabled ? "You're already in a call" : "Join call"}
      >
        Join
      </button>
    </div>
  );
}