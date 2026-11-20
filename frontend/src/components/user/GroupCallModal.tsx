import { Minimize2, Users } from "lucide-react";
import type { GroupCallModalProps } from "../../types/callTypes";
import CallControls from "./call/CallControls";
import IncomingCallPrompt from "./call/IncomingCallPrompt";
import VideoTile from "./call/VideoTile";

export type {
  GroupCallType,
  GroupCallUIStatus,
  IncomingGroupCall,
  ParticipantState,
  ActiveGroupCall,
  GroupCallModalProps,
} from "../../types/callTypes";

const BRAND_COLOR = "#8065E8";

export default function GroupCallModal({
  status,
  callType,
  groupName,
  incomingFromName,
  localStream,
  participants,
  isMuted,
  isCameraOff,
  onAccept,
  onDecline,
  onLeave,
  onToggleMute,
  onToggleCamera,
  onMinimize,
}: GroupCallModalProps) {
  if (status === "idle") return null;

  if (status === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4">
        <div
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-sm flex-col items-center gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-call-incoming-title"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <Users className="h-7 w-7" />
          </div>
          <div className="min-w-0 text-center">
            <p
              id="group-call-incoming-title"
              className="text-base font-bold text-foreground"
            >
              {incomingFromName ?? "Someone"} started a {callType} call
            </p>
            {groupName && (
              <p className="mt-1 text-xs text-muted-foreground">{groupName}</p>
            )}
          </div>
          <IncomingCallPrompt
            variant="group"
            onAccept={onAccept}
            onDecline={onDecline}
          />
        </div>
      </div>
    );
  }

  const allTiles = [
    { userId: "me", name: "You", stream: localStream },
    ...participants,
  ];

  const gridClassName =
    allTiles.length <= 1
      ? "grid-cols-1"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#17102E] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex min-w-0 items-center gap-2 text-white">
          <Users className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-semibold">
            {groupName ?? "Group call"}
          </span>
        </div>
        <button
          type="button"
          onClick={onMinimize}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          title="Minimize call"
          aria-label="Minimize call"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain ${gridClassName}`}
      >
        {allTiles.map((p) => (
          <VideoTile
            key={p.userId}
            stream={p.stream}
            label={p.userId === "me" ? "You" : p.name}
            muted={p.userId === "me"}
            mirrored={p.userId === "me"}
          />
        ))}
      </div>

      {status === "connecting" && (
        <p className="text-center text-white text-sm py-2">Ringing group...</p>
      )}

      <CallControls
        variant="panel"
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        showCamera={callType === "video"}
        onToggleMute={onToggleMute}
        onToggleCamera={onToggleCamera}
        onEnd={onLeave}
      />
    </div>
  );
}
