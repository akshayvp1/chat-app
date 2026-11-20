import { Phone, Video, PhoneOff, Maximize2 } from "lucide-react";
import { useElapsedSeconds, formatDuration } from "../hooks/useElapsedSeconds";

const BRAND_COLOR = "#8065E8";

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
      className="fixed bottom-3 left-2 right-2 z-50 flex max-w-full cursor-pointer items-center gap-2 rounded-2xl bg-[#241B45] px-3 py-2 text-white shadow-2xl sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-auto sm:max-w-[min(24rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-full"
      onClick={onExpand}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onExpand();
        }
      }}
      role="button"
      tabIndex={0}
      title="Expand call"
      aria-label="Expand call"
    >
      <div
        className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full"
        style={{ backgroundColor: BRAND_COLOR }}
      >
        {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col pr-1 sm:flex-none">
        <span className="max-w-full truncate text-xs font-semibold sm:max-w-[140px]">{title}</span>
        <span className="text-[10px] text-[#C9BFFF]">
          {isConnecting ? "Ringing..." : formatDuration(elapsed)}
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEnd();
        }}
        className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        title="End call"
        aria-label="End call"
      >
        <PhoneOff className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        title="Expand"
        aria-label="Expand call overlay"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}