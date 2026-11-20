import { useEffect, useState } from "react";

export function useElapsedSeconds(startTime: number | null): number {
  const [timer, setTimer] = useState<{
    startTime: number;
    elapsed: number;
  } | null>(null);

  useEffect(() => {
    if (!startTime) return;

    const update = () => {
      setTimer({
        startTime,
        elapsed: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
      });
    };

    const timeout = setTimeout(update, 0);
    const interval = setInterval(update, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [startTime]);

  if (!startTime) return 0;
  return timer?.startTime === startTime ? timer.elapsed : 0;
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
