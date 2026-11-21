import { useState } from "react";
import { Minimize2, PhoneOff } from "lucide-react";
import type { CallModalProps } from "../../types/callTypes";
import { useHasLiveVideo } from "../../hooks/useHasLiveVideo";
import { useStreamRef } from "../../hooks/useStreamRef";
import CallControls from "./call/CallControls";
import IncomingCallPrompt from "./call/IncomingCallPrompt";

export type { CallStatus, CallType, CallModalProps } from "../../types/callTypes";

const BRAND_COLOR = "#8065E8";
const AVATAR_CLASS =
  "flex h-20 w-20 animate-pulse items-center justify-center rounded-full text-2xl font-bold sm:h-24 sm:w-24";

const TERMINAL_TEXT: Record<string, string> = {
  rejected: "Call declined",
  ended: "Call ended",
  missed: "Missed call",
};

export default function CallModal({
  status,
  callType,
  peerName,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  facingMode,
  mediaUnavailable,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onMinimize,
}: CallModalProps) {
  const localRef = useStreamRef<HTMLVideoElement>(localStream);
  const remoteVideoRef = useStreamRef<HTMLVideoElement>(remoteStream);
  const remoteAudioRef = useStreamRef<HTMLAudioElement>(remoteStream);

  const remoteHasVideo = useHasLiveVideo(remoteStream);
  const localHasVideo = useHasLiveVideo(localStream, true);
  const [swapped, setSwapped] = useState(false);

  if (status === "idle") return null;

  const initials = (peerName ?? "?").substring(0, 2).toUpperCase();
  const remoteIsSmall = swapped && localHasVideo;
  const remoteLayerClass = remoteIsSmall
    ? "absolute bottom-20 right-3 h-36 w-24 overflow-hidden rounded-xl border-2 border-white bg-black shadow-lg sm:bottom-28 sm:right-4 sm:h-52 sm:w-40"
    : "absolute inset-0 bg-black";
  const localLayerClass = swapped
    ? "absolute inset-0 bg-black"
    : "absolute bottom-20 right-3 h-36 w-24 overflow-hidden rounded-xl border-2 border-white bg-black shadow-lg sm:bottom-28 sm:right-4 sm:h-52 sm:w-40";
  const remoteAvatarClass = remoteIsSmall
    ? "h-12 w-12 text-sm"
    : "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#17102E]/95 p-3 text-white sm:p-4">
      {status === "ringing" && (
        <div className="flex max-w-full flex-col items-center gap-5 px-2 text-center sm:gap-6">
          <div className={AVATAR_CLASS} style={{ backgroundColor: BRAND_COLOR }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold sm:text-xl">{peerName}</p>
            <p className="mt-1 text-sm text-[#C9BFFF]">
              Incoming {callType === "video" ? "video" : "audio"} call...
            </p>
          </div>
          <IncomingCallPrompt
            variant="direct"
            onAccept={onAccept}
            onDecline={onReject}
          />
        </div>
      )}

      {status === "calling" && (
        <div className="flex max-w-full flex-col items-center gap-5 px-2 text-center sm:gap-6">
          <div className={AVATAR_CLASS} style={{ backgroundColor: BRAND_COLOR }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold sm:text-xl">{peerName}</p>
            <p className="mt-1 text-sm text-[#C9BFFF]">Calling...</p>
          </div>
          <div className="flex items-center gap-3">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14"
                title="Minimize call"
                aria-label="Minimize call"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onEnd}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14"
              title="Cancel call"
              aria-label="Cancel call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {status === "connecting" && (
        <div className="flex max-w-full flex-col items-center gap-5 px-2 text-center sm:gap-6">
          <div className={AVATAR_CLASS} style={{ backgroundColor: BRAND_COLOR }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold sm:text-xl">{peerName}</p>
            <p className="mt-1 text-sm text-[#C9BFFF]">Connecting...</p>
          </div>
          <div className="flex items-center gap-3">
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14"
                title="Minimize call"
                aria-label="Minimize call"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onEnd}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14"
              title="End call"
              aria-label="End call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {status === "connected" && (
        <div className="relative h-full w-full overflow-hidden">
          {callType === "video" ? (
            <>
              <div className={remoteLayerClass}>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full bg-black object-cover"
                />

                {!remoteHasVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#241B45] sm:gap-3">
                    <div
                      className={`flex items-center justify-center rounded-full font-bold ${remoteAvatarClass}`}
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      {initials}
                    </div>
                    {!remoteIsSmall && (
                      <p className="text-sm text-[#C9BFFF]">
                        {remoteStream ? "Waiting for video..." : "Connecting video..."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {localHasVideo && (
                <div className={localLayerClass}>
                  <video
                    ref={localRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full -scale-x-100 bg-black object-cover"
                  />
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold">
                    You · {facingMode === "environment" ? "Back" : "Front"}
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute left-1/2 top-3 max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full bg-black/40 px-3 py-1.5 text-sm font-semibold sm:top-4 sm:px-4">
                {swapped && localHasVideo ? "You" : peerName}
              </div>

              {(mediaUnavailable?.audio || mediaUnavailable?.video) && (
                <div className="pointer-events-none absolute left-1/2 top-14 max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full bg-black/55 px-3 py-1 text-xs text-white sm:top-16">
                  {mediaUnavailable.video && mediaUnavailable.audio
                    ? "Camera and microphone unavailable"
                    : mediaUnavailable.video
                      ? "Camera unavailable — audio only"
                      : "Microphone unavailable — video only"}
                </div>
              )}

              <CallControls
                variant="overlay"
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                showCamera={callType === "video"}
                onToggleMute={onToggleMute}
                onToggleCamera={onToggleCamera}
                onEnd={onEnd}
                onSwitchCamera={onSwitchCamera}
                onSwapViews={() => setSwapped((current) => !current)}
                onMinimize={onMinimize}
                showCameraSwitch={callType === "video" && Boolean(onSwitchCamera)}
                showSwapViews={callType === "video" && localHasVideo && remoteHasVideo}
              />
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <div className="flex max-w-full flex-col items-center gap-4 px-2 text-center">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold sm:h-28 sm:w-28 sm:text-3xl"
                  style={{ backgroundColor: BRAND_COLOR }}
                >
                  {initials}
                </div>
                <p className="max-w-full truncate text-lg font-bold sm:text-xl">{peerName}</p>
                <p className="text-sm text-[#C9BFFF]">{remoteStream ? "Audio call in progress" : "Connecting..."}</p>
                <audio ref={remoteAudioRef} autoPlay />
              </div>

              <CallControls
                variant="overlay"
                isMuted={isMuted}
                isCameraOff={false}
                showCamera={false}
                onToggleMute={onToggleMute}
                onToggleCamera={onToggleCamera}
                onEnd={onEnd}
                onMinimize={onMinimize}
              />
            </div>
          )}
        </div>
      )}

      {TERMINAL_TEXT[status] && (
        <div className="flex max-w-full flex-col items-center gap-4 px-2 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <PhoneOff className="h-8 w-8" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold sm:text-xl">{peerName}</p>
            <p className="mt-1 text-sm text-[#C9BFFF]">{TERMINAL_TEXT[status]}</p>
          </div>
        </div>
      )}
    </div>
  );
}
