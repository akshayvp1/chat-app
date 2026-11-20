import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  showCamera: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
  variant?: "overlay" | "panel";
}

const STYLES = {
  overlay: {
    container: "absolute bottom-4 flex gap-3 sm:bottom-6 sm:gap-4",
    toggle:
      "flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-12 sm:w-12",
    end: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
    endIcon: "h-5 w-5",
    endLabel: "End call",
  },
  panel: {
    container: "flex shrink-0 items-center justify-center gap-3 py-3 sm:gap-4 sm:py-4",
    toggle:
      "flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-12 sm:w-12",
    end: "flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-14 sm:w-14",
    endIcon: "h-6 w-6",
    endLabel: "Leave call",
  },
} as const;

export default function CallControls({
  isMuted,
  isCameraOff,
  showCamera,
  onToggleMute,
  onToggleCamera,
  onEnd,
  variant = "overlay",
}: CallControlsProps) {
  const styles = STYLES[variant];
  const muteLabel = isMuted ? "Unmute" : "Mute";
  const cameraLabel = isCameraOff ? "Turn camera on" : "Turn camera off";

  return (
    <div className={styles.container}>
      <button
        type="button"
        onClick={onToggleMute}
        className={styles.toggle}
        title={muteLabel}
        aria-label={muteLabel}
        aria-pressed={isMuted}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      {showCamera && (
        <button
          type="button"
          onClick={onToggleCamera}
          className={styles.toggle}
          title={cameraLabel}
          aria-label={cameraLabel}
          aria-pressed={isCameraOff}
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
        className={styles.end}
        title={styles.endLabel}
        aria-label={styles.endLabel}
      >
        <PhoneOff className={styles.endIcon} />
      </button>
    </div>
  );
}
