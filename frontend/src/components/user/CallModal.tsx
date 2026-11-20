import { PhoneOff } from "lucide-react";
import type { CallModalProps } from "../../types/callTypes";
import { useHasLiveVideo } from "../../hooks/useHasLiveVideo";
import { useStreamRef } from "../../hooks/useStreamRef";
import CallControls from "./call/CallControls";
import IncomingCallPrompt from "./call/IncomingCallPrompt";

export type { CallStatus, CallType, CallModalProps } from "../../types/callTypes";

const BRAND_COLOR = "#8065E8";
const AVATAR_CLASS =
  "flex h-20 w-20 animate-pulse items-center justify-center rounded-full text-2xl font-bold sm:h-24 sm:w-24";

export default function CallModal({
  status,
  callType,
  peerName,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleCamera,
}: CallModalProps) {
  const localRef = useStreamRef<HTMLVideoElement>(localStream);
  const remoteVideoRef = useStreamRef<HTMLVideoElement>(remoteStream);
  const remoteAudioRef = useStreamRef<HTMLAudioElement>(remoteStream);

  const remoteHasVideo = useHasLiveVideo(remoteStream);

  if (status === "idle") return null;

  const initials = (peerName ?? "?").substring(0, 2).toUpperCase();

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
      )}

      {status === "connected" && (
        <div className="relative w-full h-full flex items-center justify-center">
          {callType === "video" ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover bg-black"
              />

              {/* Remote camera off / not arrived yet */}
              {!remoteHasVideo && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#241B45]">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {initials}
                  </div>
                  <p className="text-sm text-[#C9BFFF]">
                    {remoteStream ? "Camera is off" : "Connecting video..."}
                  </p>
                </div>
              )}

              <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-20 right-3 h-36 w-24 -scale-x-100 rounded-xl border-2 border-white bg-black object-cover shadow-lg sm:bottom-24 sm:right-4 sm:h-52 sm:w-40"
              />

              <div className="absolute left-1/2 top-3 max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full bg-black/40 px-3 py-1.5 text-sm font-semibold sm:top-4 sm:px-4">
                {peerName}
              </div>
            </>
          ) : (
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
          )}

          <CallControls
            variant="overlay"
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            showCamera={callType === "video"}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onEnd={onEnd}
          />
        </div>
      )}
    </div>
  );
}
