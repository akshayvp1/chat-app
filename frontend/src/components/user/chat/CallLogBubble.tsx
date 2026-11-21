import { memo } from "react";
import { Phone, Video } from "lucide-react";

import { BRAND_COLOR } from "../../../constants/brand";
import type { CallInfo, GroupCallInfo } from "../../../types/types";

interface CallLogBubbleProps {
  call: CallInfo | GroupCallInfo;
  createdAt: string;
  variant: "direct" | "group";
  isMe?: boolean;
}

function formatDuration(duration: number): string {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getLabel(call: CallInfo | GroupCallInfo, variant: "direct" | "group") {
  const duration = formatDuration(call.duration);
  const callName = call.callType === "video" ? "Video" : "Voice";

  if (variant === "direct") {
    const directCall = call as CallInfo;

    if (
      directCall.status === "missed" ||
      directCall.status === "rejected"
    ) {
      return directCall.status === "missed"
        ? `Missed ${callName.toLowerCase()} call`
        : `${callName} call declined`;
    }

    return `${callName} call · ${duration}`;
  }

  const groupCall = call as GroupCallInfo;

  if (groupCall.status === "missed") {
    return `Missed ${callName.toLowerCase()} group call`;
  }

  return `${callName} call · ${duration} · ${groupCall.participantCount} joined`;
}

function isMissedCall(call: CallInfo | GroupCallInfo, variant: "direct" | "group") {
  return variant === "direct"
    ? (call as CallInfo).status === "missed" ||
        (call as CallInfo).status === "rejected"
    : (call as GroupCallInfo).status === "missed";
}

function CallLogBubble({
  call,
  createdAt,
  variant,
  isMe = false,
}: CallLogBubbleProps) {
  const isMissed = isMissedCall(call, variant);
  const Icon = call.callType === "video" ? Video : Phone;

  return (
    <div
      className={
        variant === "group"
          ? "flex justify-center"
          : `flex ${isMe ? "justify-end" : "justify-start"}`
      }
    >
      <div className="flex max-w-full items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm dark:border-border">
        <Icon
          className="h-4 w-4 shrink-0"
          style={{
            color: isMissed ? "#ef4444" : BRAND_COLOR,
          }}
        />

        <span
          className={`min-w-0 text-xs font-medium ${
            isMissed
              ? "text-red-500 dark:text-red-400"
              : "text-card-foreground"
          }`}
        >
          {getLabel(call, variant)}
        </span>

        <span className="shrink-0 text-[10px] text-muted-foreground">
          {new Date(createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

export default memo(CallLogBubble);
