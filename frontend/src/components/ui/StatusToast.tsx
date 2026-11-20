import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";

export type StatusToastKind = "success" | "error" | "warning";

export interface StatusToastData {
  kind: StatusToastKind;
  message: string;
}

interface StatusToastProps {
  toast: StatusToastData | null;
  onDismiss: () => void;
  duration?: number;
}

const styles: Record<StatusToastKind, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
  error:
    "border-red-200 bg-red-50 text-red-800 shadow-red-500/10 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 shadow-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
};

const icons: Record<StatusToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

export default function StatusToast({
  toast,
  onDismiss,
  duration = 4000,
}: StatusToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(onDismiss, duration);
    return () => clearTimeout(timeout);
  }, [toast, onDismiss, duration]);

  if (!toast) return null;

  const Icon = icons[toast.kind];

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-70 flex justify-center px-1 sm:inset-x-auto sm:right-5 sm:justify-end">
      <div
        role={toast.kind === "success" ? "status" : "alert"}
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur ${styles[toast.kind]}`}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 break-words">{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="rounded-full p-0.5 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
