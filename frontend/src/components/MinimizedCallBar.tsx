import React from "react";
import { Phone, Video, PhoneOff, Maximize2 } from "lucide-react";
import { useElapsedSeconds, formatDuration } from "../hooks/useElapsedSeconds";

const BRAND_COLOR = "#5b7cfa";

interface MinimizedCallBarProps {
  title: string;
  isVideo: boolean;
  isConnecting: boolean;
  startedAt: number | null;
  onExpand: () => void;
  onEnd: () => void;
}

export default function MinimizedCallBar({
  title,
  isVideo,
  isConnecting,
  startedAt,
  onExpand,
  onEnd,
}: MinimizedCallBarProps) {
  const elapsed = useElapsedSeconds(startedAt);

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white rounded-full shadow-2xl px-3 py-2 cursor-pointer max-w-[92vw]"
      onClick={onExpand}
      role="button"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 animate-pulse"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
      </div>

      <div className="flex flex-col min-w-0 pr-1">
        <span className="text-xs font-semibold truncate max-w-[120px]">{title}</span>
        <span className="text-[10px] text-slate-300">
          {isConnecting ? "Ringing..." : formatDuration(elapsed)}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEnd();
        }}
        className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0 ml-1"
        title="End call"
      >
        <PhoneOff className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"
        title="Expand"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}