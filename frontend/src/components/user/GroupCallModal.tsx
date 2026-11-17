import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Phone,
  Users,
  Minimize2,
} from "lucide-react";

const BRAND_COLOR = "#5b7cfa";

interface Participant {
  userId: string;
  name: string;
  stream: MediaStream | null;
}

interface GroupCallModalProps {
  status: "idle" | "incoming" | "connecting" | "in-call";
  callType: "audio" | "video" | null;
  groupName?: string;
  incomingFromName?: string;
  localStream: MediaStream | null;
  participants: Participant[];
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onMinimize: () => void;
}

/**
 * A remote peer's video can stop arriving at any time (they turned the
 * camera off, or it's an audio call). We keep the <video> element mounted
 * either way so audio keeps playing, and overlay an avatar when there is
 * nothing to show. Detaching the element would silence the peer.
 */
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

function VideoTile({
  stream,
  label,
  muted,
  mirrored,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = useHasLiveVideo(stream);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    // Autoplay can be rejected until the user interacts; ignore the reject.
    el.play().catch(() => undefined);
  }, [stream]);

  return (
    <div className="relative bg-slate-800 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirrored ? "-scale-x-100" : ""} ${
          hasVideo ? "" : "opacity-0"
        }`}
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      <span className="absolute bottom-1.5 left-2 text-[11px] text-white bg-black/40 px-1.5 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
}

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
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-xl">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            <Users className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-900">
              {incomingFromName ?? "Someone"} started a {callType} call
            </p>
            {groupName && <p className="text-xs text-gray-400 mt-1">{groupName}</p>}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <button
              type="button"
              onClick={onDecline}
              className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white"
            >
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allTiles = [
    { userId: "me", name: "You", stream: localStream },
    ...participants,
  ];

  const columns = allTiles.length <= 1 ? 1 : allTiles.length <= 4 ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col p-4">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2 text-white">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold truncate max-w-[60vw]">
            {groupName ?? "Group call"}
          </span>
        </div>
        <button
          type="button"
          onClick={onMinimize}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
          title="Minimize"
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      </div>

      <div
        className="flex-1 grid gap-2 overflow-y-auto content-start"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
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

      <div className="flex items-center justify-center gap-4 py-4">
        <button
          type="button"
          onClick={onToggleMute}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {callType === "video" && (
          <button
            type="button"
            onClick={onToggleCamera}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white"
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
          onClick={onLeave}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}