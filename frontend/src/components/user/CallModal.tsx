import React, { useCallback, useEffect, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";

const BRAND_COLOR = "#5b7cfa";

export type CallStatus = "idle" | "calling" | "ringing" | "connected";
export type CallType = "audio" | "video";

interface CallModalProps {
  status: CallStatus;
  callType: CallType | null;
  peerName?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

/**
 * Attach a MediaStream to a media element via a CALLBACK REF.
 *
 * useRef + useEffect([stream]) is subtly broken here: if the stream is
 * assigned while the element is not yet mounted (which is what happened
 * to the caller, because status flipped to "connected" after
 * getUserMedia resolved), the effect runs against a null ref and nothing
 * ever re-runs it once the element appears.
 *
 * A callback ref fires on mount AND whenever the callback identity
 * changes, so both orderings are covered.
 */
function useStreamRef<T extends HTMLMediaElement>(stream: MediaStream | null) {
  return useCallback(
    (el: T | null) => {
      if (!el) return;
      if (el.srcObject !== stream) el.srcObject = stream;
      el.play().catch(() => undefined); // autoplay policy can reject; harmless
    },
    [stream]
  );
}

/** True while the stream actually carries a playable video track. */
function useHasLiveVideo(stream: MediaStream | null) {
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!stream) {
      setHasVideo(false);
      return;
    }

    const evaluate = () => {
      const tracks = stream.getVideoTracks();
      setHasVideo(
        tracks.length > 0 &&
          tracks.some((t) => t.readyState === "live" && t.enabled && !t.muted)
      );
    };

    evaluate();
    stream.addEventListener("addtrack", evaluate);
    stream.addEventListener("removetrack", evaluate);

    const tracks = stream.getVideoTracks();
    tracks.forEach((t) => {
      t.addEventListener("mute", evaluate);
      t.addEventListener("unmute", evaluate);
      t.addEventListener("ended", evaluate);
    });

    return () => {
      stream.removeEventListener("addtrack", evaluate);
      stream.removeEventListener("removetrack", evaluate);
      tracks.forEach((t) => {
        t.removeEventListener("mute", evaluate);
        t.removeEventListener("unmute", evaluate);
        t.removeEventListener("ended", evaluate);
      });
    };
  }, [stream]);

  return hasVideo;
}

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
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center text-white">
      {status === "ringing" && (
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse text-2xl font-bold"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {initials}
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{peerName}</p>
            <p className="text-sm text-slate-300 mt-1">
              Incoming {callType === "video" ? "video" : "audio"} call...
            </p>
          </div>
          <div className="flex gap-8 mt-2">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onReject}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              <span className="text-xs text-slate-300">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <Phone className="h-6 w-6" />
              </button>
              <span className="text-xs text-slate-300">Accept</span>
            </div>
          </div>
        </div>
      )}

      {status === "calling" && (
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse text-2xl font-bold"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {initials}
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{peerName}</p>
            <p className="text-sm text-slate-300 mt-1">Calling...</p>
          </div>
          <button
            type="button"
            onClick={onEnd}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: BRAND_COLOR }}
                  >
                    {initials}
                  </div>
                  <p className="text-sm text-slate-300">
                    {remoteStream ? "Camera is off" : "Connecting video..."}
                  </p>
                </div>
              )}

              <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-24 right-4 w-32 h-44 sm:w-40 sm:h-52 rounded-xl object-cover border-2 border-white shadow-lg bg-black -scale-x-100"
              />

              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-1.5 rounded-full text-sm font-semibold">
                {peerName}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                {initials}
              </div>
              <p className="text-xl font-bold">{peerName}</p>
              <p className="text-sm text-slate-300">
                {remoteStream ? "Audio call in progress" : "Connecting..."}
              </p>
              <audio ref={remoteAudioRef} autoPlay />
            </div>
          )}

          <div className="absolute bottom-6 flex gap-4">
            <button
              type="button"
              onClick={onToggleMute}
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {callType === "video" && (
              <button
                type="button"
                onClick={onToggleCamera}
                className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                {isCameraOff ? (
                  <VideoOff className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onEnd}
              className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}