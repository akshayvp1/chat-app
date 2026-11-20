import { useEffect, useRef } from "react";
import { useHasLiveVideo } from "../../../hooks/useHasLiveVideo";

const BRAND_COLOR = "#8065E8";

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirrored?: boolean;
}

export default function VideoTile({
  stream,
  label,
  muted,
  mirrored,
}: VideoTileProps) {
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
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#241B45]">
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

      <span className="absolute bottom-1.5 left-2 max-w-[calc(100%-1rem)] truncate rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white">
        {label}
      </span>
    </div>
  );
}
